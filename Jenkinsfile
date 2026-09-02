pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '20'))
        disableConcurrentBuilds()
    }

    environment {
        COMPOSE = '/home/ubuntu/app/docker-compose.app.yml'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git log -1 --oneline'
            }
        }

        stage('Build') {
            parallel {
                stage('backend') {
                    when { expression { fileExists('backend/Dockerfile') } }
                    steps { sh 'docker build -t sogong-backend:$BUILD_NUMBER -t sogong-backend:latest backend' }
                }
                stage('frontend') {
                    when { expression { fileExists('frontend/Dockerfile') } }
                    steps { sh 'docker build -t sogong-frontend:$BUILD_NUMBER -t sogong-frontend:latest frontend' }
                }
                stage('ai') {
                    when { expression { fileExists('ai/Dockerfile') } }
                    steps { sh 'docker build -t sogong-ai:$BUILD_NUMBER -t sogong-ai:latest ai' }
                }
            }
        }

        stage('Deploy') {
            when { expression { fileExists('deploy/docker-compose.app.yml') } }
            steps {
                sh 'cp deploy/docker-compose.app.yml $COMPOSE'
                sh 'docker compose -f $COMPOSE up -d'
                sleep 10
                sh 'docker compose -f $COMPOSE ps'
            }
        }

        stage('Cleanup') {
            steps { sh 'docker image prune -f' }
        }
    }

    post {
        success { echo "SUCCESS #${env.BUILD_NUMBER}" }
        failure { echo "FAILED #${env.BUILD_NUMBER}  →  롤백: /home/ubuntu/infra/rollback.sh <서비스> <이전번호>" }
    }
}
