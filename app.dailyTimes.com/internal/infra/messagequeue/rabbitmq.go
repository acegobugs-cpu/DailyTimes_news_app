package messagequeue

import (
	"context"
	"fmt"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"

	"app/internal/pkg/config"
	"app/internal/pkg/logger"
)

// RabbitMQ represents a RabbitMQ connection
type RabbitMQ struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	config  *config.RabbitMQConfig
}

// NewRabbitMQ creates a new RabbitMQ connection
func NewRabbitMQ(cfg *config.RabbitMQConfig) (*RabbitMQ, error) {
	url := fmt.Sprintf(
		"amqp://%s:%s@%s:%d%s",
		cfg.User, cfg.Password, cfg.Host, cfg.Port, cfg.Vhost,
	)

	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	channel, err := conn.Channel()
	if err != nil {
		return nil, fmt.Errorf("failed to open channel: %w", err)
	}

	logger.Info("RabbitMQ connection established")

	return &RabbitMQ{
		conn:    conn,
		channel: channel,
		config:  cfg,
	}, nil
}

// Channel returns the AMQP channel
func (r *RabbitMQ) Channel() *amqp.Channel {
	return r.channel
}

// Close closes the RabbitMQ connection
func (r *RabbitMQ) Close(ctx context.Context) error {
	if r.channel != nil {
		if err := r.channel.Close(); err != nil {
			// logger.Error("Failed to close RabbitMQ channel", logger.WithField("error", err))
		}
	}
	if r.conn != nil {
		if err := r.conn.Close(); err != nil {
			// logger.Error("Failed to close RabbitMQ connection", logger.WithField("error", err))
		}
	}
	logger.Info("RabbitMQ connection closed")
	return nil
}

// DeclareQueue declares a queue
func (r *RabbitMQ) DeclareQueue(name string, durable bool) error {
	_, err := r.channel.QueueDeclare(
		name,
		durable,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to declare queue: %w", err)
	}
	return nil
}

// DeclareExchange declares an exchange
func (r *RabbitMQ) DeclareExchange(name, kind string) error {
	err := r.channel.ExchangeDeclare(
		name,
		kind,
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to declare exchange: %w", err)
	}
	return nil
}

// BindQueue binds a queue to an exchange
func (r *RabbitMQ) BindQueue(queue, exchange, routingKey string) error {
	err := r.channel.QueueBind(
		queue,
		routingKey,
		exchange,
		false,
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to bind queue: %w", err)
	}
	return nil
}

// Publish publishes a message to an exchange
func (r *RabbitMQ) Publish(ctx context.Context, exchange, routingKey string, body []byte) error {
	err := r.channel.PublishWithContext(
		ctx,
		exchange,
		routingKey,
		false,
		false,
		amqp.Publishing{
			ContentType:  "application/json",
			Body:         body,
			DeliveryMode: amqp.Persistent,
			Timestamp:    time.Now(),
		},
	)
	if err != nil {
		return fmt.Errorf("failed to publish message: %w", err)
	}
	return nil
}

// Consume consumes messages from a queue
func (r *RabbitMQ) Consume(queue string) (<-chan amqp.Delivery, error) {
	msgs, err := r.channel.Consume(
		queue,
		"",
		false,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to register consumer: %w", err)
	}
	return msgs, nil
}

// Qos sets quality of service
func (r *RabbitMQ) Qos(prefetchCount int) error {
	err := r.channel.Qos(
		prefetchCount,
		0,
		false,
	)
	if err != nil {
		return fmt.Errorf("failed to set QoS: %w", err)
	}
	return nil
}
