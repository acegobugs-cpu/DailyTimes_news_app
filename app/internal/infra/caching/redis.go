package caching

import (
	"context"
	"net"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisCache struct {
	Client *redis.Client
}

// Pass configuration dynamically, return the wrapper and an error gracefully
func NewRedisCache(host string, port int, password string, db int) (*RedisCache, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:         net.JoinHostPort(host, strconv.Itoa(port)),
		Password:     password,
		DB:           db,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
		PoolSize:     10,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		_ = rdb.Close()
		return nil, err // Let main.go decide if it wants to log.Fatal
	}

	return &RedisCache{Client: rdb}, nil
}
