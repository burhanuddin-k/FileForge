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
                    test -f Dockerfile
                    test -f docker-compose.yml
                    test -f server.js
                    test -f schema.sql
                    echo "All required files found."
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    docker build \
                      -t fileforge-app:${BUILD_NUMBER} \
                      -t fileforge-app:latest .
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

        stage('Deploy') {
            steps {
                sh '''
                    docker compose up -d --build
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    sleep 10

                    docker compose ps

                    curl -f http://localhost/ || exit 1

                    echo "FileForge deployment successful!"
                '''
            }
        }
    }

    post {
        always {
            sh '''
                docker compose logs --tail=50 || true
            '''
        }

        success {
            echo 'FILEFORGE DEPLOYMENT SUCCESSFUL!'
        }

        failure {
            echo 'FILEFORGE DEPLOYMENT FAILED!'
        }
    }
}