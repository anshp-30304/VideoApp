FROM node:18-alpine

# Install FFmpeg, curl, bash (needed for ngrok + dev tools)
RUN apk add --no-cache ffmpeg curl bash

# Install ngrok
RUN curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | tee /etc/apk/keys/ngrok.asc \
    && echo "https://ngrok-agent.s3.amazonaws.com/alpine/" >> /etc/apk/repositories \
    && apk add --no-cache ngrok

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies)
RUN npm install

# Install nodemon globally
RUN npm install -g nodemon

# Copy application code
COPY . .

# Create directories for uploads and outputs
RUN mkdir -p uploads outputs public

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership of app directory
RUN chown -R nextjs:nodejs /app

# Expose app and ngrok ports
EXPOSE 3000 4040

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => { process.exit(1) })"

# Start both Node app (with nodemon) and ngrok
CMD sh -c "nodemon --legacy-watch server.js & ngrok http 3000 --log=stdout"
