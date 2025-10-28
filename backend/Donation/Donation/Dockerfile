# Stage 1 — build
FROM maven:3.9.8-eclipse-temurin-17 AS builder
WORKDIR /app

# copy maven files and download deps
COPY pom.xml .
RUN mvn dependency:go-offline -B

# copy source and build
COPY . .
RUN mvn clean package -DskipTests

# Stage 2 — runtime
FROM eclipse-temurin:17-jdk-alpine
WORKDIR /app

# copy jar from builder
COPY --from=builder /app/target/*.jar app.jar

## optional: copy .env (for local dedocker run --env-file .env -p 8080:8080 food-donation-backendv only)
#COPY .env .env

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
