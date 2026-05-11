// Package crypto provides authenticated symmetric encryption helpers.
//
// AES-256-GCM is used to encrypt OAuth tokens at rest. Each encryption uses a
// fresh 96-bit nonce; the same nonce must never be reused with the same key.
package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
)

const (
	// KeySize is the required AES key length in bytes (AES-256).
	KeySize = 32
	// NonceSize is the GCM nonce length in bytes (96-bit, NIST recommendation).
	NonceSize = 12
)

// Encrypt encrypts plaintext using AES-256-GCM with a freshly generated nonce.
// Returns the ciphertext (with appended auth tag) and the nonce. Key must be
// exactly KeySize bytes.
func Encrypt(key []byte, plaintext string) ([]byte, []byte, error) {
	if len(key) != KeySize {
		return nil, nil, fmt.Errorf("crypto.Encrypt: key must be %d bytes, got %d", KeySize, len(key))
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, nil, fmt.Errorf("crypto.Encrypt: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, nil, fmt.Errorf("crypto.Encrypt: %w", err)
	}

	nonce := make([]byte, NonceSize)
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, nil, fmt.Errorf("crypto.Encrypt: nonce: %w", err)
	}

	ciphertext := gcm.Seal(nil, nonce, []byte(plaintext), nil)
	return ciphertext, nonce, nil
}

// Decrypt decrypts ciphertext using AES-256-GCM and verifies the auth tag.
// Returns an error if the key, nonce, or ciphertext have been tampered with.
func Decrypt(key, ciphertext, nonce []byte) (string, error) {
	if len(key) != KeySize {
		return "", fmt.Errorf("crypto.Decrypt: key must be %d bytes, got %d", KeySize, len(key))
	}
	if len(nonce) != NonceSize {
		return "", fmt.Errorf("crypto.Decrypt: nonce must be %d bytes, got %d", NonceSize, len(nonce))
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("crypto.Decrypt: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("crypto.Decrypt: %w", err)
	}

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("crypto.Decrypt: %w", err)
	}
	return string(plaintext), nil
}

// DeriveKey decodes a hex-encoded encryption key (64 hex chars = 32 bytes).
// Used to load the ENCRYPTION_KEY env var into raw bytes.
func DeriveKey(hexKey string) ([]byte, error) {
	key, err := hex.DecodeString(hexKey)
	if err != nil {
		return nil, fmt.Errorf("crypto.DeriveKey: %w", err)
	}
	if len(key) != KeySize {
		return nil, fmt.Errorf("crypto.DeriveKey: key must decode to %d bytes, got %d", KeySize, len(key))
	}
	return key, nil
}
