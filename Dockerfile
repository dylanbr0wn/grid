FROM node:24-bookworm-slim AS web-build
WORKDIR /app

RUN npm install --global pnpm@11.2.2
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json ./web/package.json
RUN pnpm install --frozen-lockfile

COPY web ./web
RUN pnpm --filter web build

FROM golang:1.26.5-bookworm AS go-build
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
COPY internal ./internal
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/grid .

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=go-build /out/grid ./bin/grid
COPY --from=web-build /app/web/dist ./web/dist

USER 65534:65534
EXPOSE 8080
CMD ["./bin/grid"]
