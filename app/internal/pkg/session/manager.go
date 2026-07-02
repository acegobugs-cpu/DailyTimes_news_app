package session

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"app/internal/domain/entities"
	"app/internal/pkg/crypto"
	"app/internal/pkg/errors"
)

var rotateTokenLua = redis.NewScript(`
    local old_pointer_key = KEYS[1]
    local old_session_key = KEYS[2]
    local new_pointer_key = KEYS[3]
    local new_session_key = KEYS[4]

    local new_payload = ARGV[1]
    local user_id = ARGV[2]
    local ttl = tonumber(ARGV[3])

    local old_exists = redis.call("EXISTS", old_session_key)
    if old_exists == 0 then
        return {err = "OLD_TOKEN_NOT_FOUND"}
    end

    redis.call("SET", new_session_key, new_payload, "EX", ttl)
    redis.call("SET", new_pointer_key, user_id, "EX", ttl)

    redis.call("DEL", old_pointer_key)
    redis.call("DEL", old_session_key)

    return "OK"
`)

type Config struct {
	EncryptionKey   string
	RefreshDuration time.Duration
	AccessDuration  time.Duration
}

type SessionManager struct {
	redis  *redis.Client
	logger *zap.Logger
	cfg    Config
}

func NewSessionManager(r *redis.Client, l *zap.Logger, cfg Config) *SessionManager {
	return &SessionManager{
		redis:  r,
		logger: l,
		cfg:    cfg,
	}
}

// CreateSession establishes the initial login state records for both keys
func (m *SessionManager) CreateSession(ctx context.Context, userID uuid.UUID, ipAddress, userAgent string) (string, error) {
	rawRefreshToken, err := m.generateRandomToken()
	if err != nil {
		return "", errors.ErrInternalServer
	}
	hash := m.hashToken(rawRefreshToken)
	expiresAt := time.Now().Add(m.cfg.RefreshDuration)

	sessionObj := entities.NewRefreshToken(userID, hash, expiresAt)
	sessionObj.IPAddress = &ipAddress
	sessionObj.UserAgent = &userAgent

	jsonData, err := json.Marshal(sessionObj)
	if err != nil {
		return "", errors.ErrInternalServer
	}

	encryptedData := string(jsonData)
	if m.cfg.EncryptionKey != "" {
		encryptedData, err = crypto.Encrypt(string(jsonData))
		if err != nil {
			return "", errors.ErrInternalServer
		}
	}

	pointerKey := fmt.Sprintf("refresh:pointer:%s", hash)
	sessionKey := fmt.Sprintf("refresh:token:%s:%s", userID.String(), hash)

	// Execute pipelined allocation to write both tracking keys seamlessly
	pipe := m.redis.Pipeline()
	pipe.Set(ctx, sessionKey, encryptedData, m.cfg.RefreshDuration)
	pipe.Set(ctx, pointerKey, userID.String(), m.cfg.RefreshDuration)

	if _, err := pipe.Exec(ctx); err != nil {
		return "", errors.ErrInternalServer.W("failed to save refresh session pipeline", "")
	}

	return rawRefreshToken, nil
}

func (m *SessionManager) Rotate(ctx context.Context, oldRefreshToken string, userAgent, ipAddress string) (string, uuid.UUID, error) {
	oldHash := m.hashToken(oldRefreshToken)
	oldPointerKey := fmt.Sprintf("refresh:pointer:%s", oldHash)

	userIDStr, err := m.redis.Get(ctx, oldPointerKey).Result()
	if err == redis.Nil {
		return "", uuid.Nil, errors.ErrInvalidToken
	} else if err != nil {
		return "", uuid.Nil, err
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return "", uuid.Nil, errors.ErrInvalidToken
	}

	oldSessionKey := fmt.Sprintf("refresh:token:%s:%s", userID.String(), oldHash)
	jsonData, err := m.redis.Get(ctx, oldSessionKey).Result()
	if err == redis.Nil {
		return "", uuid.Nil, errors.ErrInvalidToken
	} else if err != nil {
		return "", uuid.Nil, err
	}

	decryptedData := jsonData
	if m.cfg.EncryptionKey != "" {
		decryptedData, err = crypto.Decrypt(jsonData)
		if err != nil {
			m.logger.Error("Failed to decrypt refresh token data", zap.Error(err))
			return "", uuid.Nil, errors.ErrInvalidToken
		}
	}

	var currentSession entities.RefreshToken
	if err := json.Unmarshal([]byte(decryptedData), &currentSession); err != nil {
		return "", uuid.Nil, errors.ErrInternalServer
	}

	if time.Now().After(currentSession.ExpiresAt) {
		m.redis.Del(ctx, oldPointerKey, oldSessionKey)
		return "", uuid.Nil, errors.ErrTokenExpired
	}

	newRefreshToken, err := m.generateRandomToken()
	if err != nil {
		return "", uuid.Nil, errors.ErrInternalServer
	}
	newHash := m.hashToken(newRefreshToken)
	newExpiresAt := time.Now().Add(m.cfg.RefreshDuration)

	newSession := entities.NewRefreshToken(userID, newHash, newExpiresAt)
	newSession.IPAddress = &ipAddress
	newSession.UserAgent = &userAgent

	newJsonData, err := json.Marshal(newSession)
	if err != nil {
		return "", uuid.Nil, errors.ErrInternalServer
	}

	encryptedNewData := string(newJsonData)
	if m.cfg.EncryptionKey != "" {
		encryptedNewData, err = crypto.Encrypt(string(newJsonData))
		if err != nil {
			return "", uuid.Nil, errors.ErrInternalServer
		}
	}

	newPointerKey := fmt.Sprintf("refresh:pointer:%s", newHash)
	newSessionKey := fmt.Sprintf("refresh:token:%s:%s", userID.String(), newHash)
	ttlSeconds := int(m.cfg.RefreshDuration.Seconds())

	keys := []string{oldPointerKey, oldSessionKey, newPointerKey, newSessionKey}
	_, err = rotateTokenLua.Run(ctx, m.redis, keys, encryptedNewData, userID.String(), ttlSeconds).Result()
	if err != nil {
		if err.Error() == "OLD_TOKEN_NOT_FOUND" {
			return "", uuid.Nil, errors.ErrInvalidToken
		}
		return "", uuid.Nil, err
	}

	return newRefreshToken, userID, nil
}

func (m *SessionManager) Revoke(ctx context.Context, refreshToken string) error {
	hash := m.hashToken(refreshToken)
	pointerKey := fmt.Sprintf("refresh:pointer:%s", hash)

	userIDStr, err := m.redis.Get(ctx, pointerKey).Result()
	if err == redis.Nil {
		return errors.ErrInvalidToken
	} else if err != nil {
		return err
	}

	sessionKey := fmt.Sprintf("refresh:token:%s:%s", userIDStr, hash)
	deleted, err := m.redis.Del(ctx, pointerKey, sessionKey).Result()
	if err != nil {
		return err
	}

	if deleted == 0 {
		return errors.ErrInvalidToken
	}

	return nil
}

func (m *SessionManager) BlacklistToken(ctx context.Context, jti string, tokenString string) error {
	blacklistKey := fmt.Sprintf("blacklist:token:%s", jti)
	return m.redis.Set(ctx, blacklistKey, "1", m.cfg.AccessDuration).Err()
}

func (m *SessionManager) IsTokenBlacklisted(ctx context.Context, jti string) (bool, error) {
	blacklistKey := fmt.Sprintf("blacklist:token:%s", jti)
	exists, err := m.redis.Exists(ctx, blacklistKey).Result()
	if err != nil {
		return false, err
	}
	return exists > 0, nil
}

func (m *SessionManager) generateRandomToken() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (m *SessionManager) hashToken(token string) string {
	h := sha256.New()
	h.Write([]byte(token))
	return hex.EncodeToString(h.Sum(nil))
}
