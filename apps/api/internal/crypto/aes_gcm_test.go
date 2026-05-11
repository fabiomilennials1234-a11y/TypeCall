package crypto

import (
	"bytes"
	"crypto/rand"
	"strings"
	"testing"
)

func mustKey(t *testing.T) []byte {
	t.Helper()
	key := make([]byte, KeySize)
	if _, err := rand.Read(key); err != nil {
		t.Fatalf("rand: %v", err)
	}
	return key
}

func TestEncryptDecrypt_RoundTrip(t *testing.T) {
	key := mustKey(t)

	tests := []struct {
		name      string
		plaintext string
	}{
		{"empty", ""},
		{"short", "hello"},
		{"oauth token shape", "ya29.A0ARrdaM-fakeAccessToken_with-some_chars.123"},
		{"unicode", "olá mundo 🌍"},
		{"long", strings.Repeat("x", 4096)},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			ct, nonce, err := Encrypt(key, tc.plaintext)
			if err != nil {
				t.Fatalf("Encrypt: %v", err)
			}
			if len(nonce) != NonceSize {
				t.Errorf("nonce size = %d, want %d", len(nonce), NonceSize)
			}
			got, err := Decrypt(key, ct, nonce)
			if err != nil {
				t.Fatalf("Decrypt: %v", err)
			}
			if got != tc.plaintext {
				t.Errorf("round-trip mismatch: got %q, want %q", got, tc.plaintext)
			}
		})
	}
}

func TestEncrypt_ProducesUniqueNonces(t *testing.T) {
	key := mustKey(t)
	ct1, nonce1, err := Encrypt(key, "same input")
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	ct2, nonce2, err := Encrypt(key, "same input")
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	if bytes.Equal(nonce1, nonce2) {
		t.Error("nonces must differ between encryptions")
	}
	if bytes.Equal(ct1, ct2) {
		t.Error("ciphertexts of same plaintext must differ (different nonces)")
	}
}

func TestDecrypt_WrongKeyFails(t *testing.T) {
	key1 := mustKey(t)
	key2 := mustKey(t)
	ct, nonce, err := Encrypt(key1, "secret")
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	if _, err := Decrypt(key2, ct, nonce); err == nil {
		t.Error("expected decryption with wrong key to fail")
	}
}

func TestDecrypt_TamperedCiphertextFails(t *testing.T) {
	key := mustKey(t)
	ct, nonce, err := Encrypt(key, "secret")
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	ct[0] ^= 0xff
	if _, err := Decrypt(key, ct, nonce); err == nil {
		t.Error("expected decryption of tampered ciphertext to fail")
	}
}

func TestDecrypt_WrongNonceFails(t *testing.T) {
	key := mustKey(t)
	ct, _, err := Encrypt(key, "secret")
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	wrongNonce := make([]byte, NonceSize)
	if _, err := Decrypt(key, ct, wrongNonce); err == nil {
		t.Error("expected decryption with wrong nonce to fail")
	}
}

func TestEncrypt_RejectsBadKeySize(t *testing.T) {
	for _, sz := range []int{0, 16, 24, 31, 33, 64} {
		key := make([]byte, sz)
		if _, _, err := Encrypt(key, "x"); err == nil {
			t.Errorf("expected error for key size %d", sz)
		}
	}
}

func TestDecrypt_RejectsBadKeyOrNonce(t *testing.T) {
	good := mustKey(t)
	ct, nonce, err := Encrypt(good, "x")
	if err != nil {
		t.Fatalf("Encrypt: %v", err)
	}
	if _, err := Decrypt(make([]byte, 16), ct, nonce); err == nil {
		t.Error("expected error for bad key size")
	}
	if _, err := Decrypt(good, ct, make([]byte, 8)); err == nil {
		t.Error("expected error for bad nonce size")
	}
}

func TestDeriveKey(t *testing.T) {
	tests := []struct {
		name    string
		hex     string
		wantErr bool
	}{
		{"valid 64 hex chars", strings.Repeat("ab", 32), false},
		{"too short", "abcd", true},
		{"too long", strings.Repeat("ab", 33), true},
		{"invalid chars", strings.Repeat("zz", 32), true},
		{"empty", "", true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			key, err := DeriveKey(tc.hex)
			if tc.wantErr {
				if err == nil {
					t.Errorf("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(key) != KeySize {
				t.Errorf("key size = %d, want %d", len(key), KeySize)
			}
		})
	}
}
