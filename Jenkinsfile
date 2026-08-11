pipeline {
    agent any

    environment {
        IMAGE_NAME = 'fileforge-app'
        COMPOSE_PROJECT_NAME = 'fileforge'
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Verify files') {
            steps {
                sh 'test -f Dockerfile'
                sh 'test -f docker-compose.yml'
                sh 'test -f server.js'
                sh 'test -f auth.html'
                sh 'test -f auth.js'
                sh 'test -f schema.sql'
            }
        }

        stage('Build Docker image') {
            steps {
                sh 'docker build -t ${IMAGE_NAME}:${BUILD_NUMBER} -t ${IMAGE_NAME}:latest .'
            }
        }

        stage('Stop old deployment') {
            steps {
                sh 'docker compose down --remove-orphans || true'
            }
        }

        stage('Deploy') {
            steps {
                sh 'docker compose up -d --build'
            }
        }

        stage('Health check') {
            steps {
                sh 'sleep 8'
                sh 'curl -fsS http://127.0.0.1/api/health'
            }
        }
    }

    post {
        always {
            sh 'docker image prune -f || true'
        }
        success {
            echo 'FileForge deployment completed successfully.'
        }
        failure {
            sh 'docker compose logs --tail=100 || true'
        }
    }
}
