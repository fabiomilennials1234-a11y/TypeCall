FROM golang:1.25-alpine AS builder

RUN apk add --no-cache ca-certificates git

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w -X main.version=${VERSION}" \
    -o /api ./cmd/api

FROM gcr.io/distroless/static-debian12

COPY --from=builder /api /api
COPY --from=builder /build/migrations /migrations

EXPOSE 8080

USER nonroot:nonroot

CMD ["/api"]
