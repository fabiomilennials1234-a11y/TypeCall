FROM golang:1.23-alpine AS builder

RUN apk add --no-cache ca-certificates git

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /api ./cmd/api

FROM gcr.io/distroless/static-debian12

COPY --from=builder /api /api
COPY --from=builder /build/migrations /migrations

EXPOSE 8080

CMD ["/api"]
