# ===========================
# 🌱 Stage 1 — Build
# ===========================
FROM maven:3.9.8-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy only the Maven descriptor first for caching dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source files and build application
COPY src ./src
RUN mvn clean package -DskipTests -B

# ===========================
# 🚀 Stage 2 — Runtime
# ===========================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Add a non-root user for better security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring

# Copy built jar from builder
COPY --from=builder /app/target/*.jar app.jar

# Set JVM optimizations for container environments
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
