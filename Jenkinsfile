pipeline {

    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Verify Files') {
            steps {
                sh '''
                    echo "Checking required files..."

                    test -f Dockerfile
                    test -f docker-compose.yml
                    test -f server.js
                    test -f auth.html
                    test -f auth.js
                    test -f schema.sql

                    echo "All required files found."
                '''
            }
        }

        stage('Stop Old Deployment') {
            steps {
                sh '''
                    docker compose down --remove-orphans
                '''
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                sh '''
                    docker compose up -d --build
                '''
            }
        }

        stage('Check Containers') {
            steps {
                sh '''
                    docker compose ps
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    sleep 10

                    echo "Testing FileForge..."

                    curl -f http://localhost/ || exit 1

                    echo "FileForge is running successfully!"
                '''
            }
        }
    }

    post {

        always {
            sh '''
                echo "===== Docker Compose Status ====="
                docker compose ps || true

                echo "===== Recent Logs ====="
                docker compose logs --tail=50 || true
            '''
        }

        success {
            echo '======================================'
            echo ' FILEFORGE DEPLOYMENT SUCCESSFUL!'
            echo '======================================'
        }

        failure {
            echo '======================================'
            echo ' FILEFORGE DEPLOYMENT FAILED!'
            echo '======================================'
        }
    }
}