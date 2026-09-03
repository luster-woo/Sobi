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
                    when { expression { fileExists('backend/Dockerfile') && (fileExists('backend/build.gradle') || fileExists('backend/pom.xml')) } }
                    steps { sh 'docker build -t sogong-backend:$BUILD_NUMBER -t sogong-backend:latest backend' }
                }
                stage('frontend') {
                    when { expression { fileExists('frontend/Dockerfile') && fileExists('frontend/package.json') } }
                    steps { sh 'docker build -t sogong-frontend:$BUILD_NUMBER -t sogong-frontend:latest frontend' }
                }
                stage('ai') {
                    when { expression { fileExists('ai/Dockerfile') && fileExists('ai/requirements.txt') } }
                    steps { sh 'docker build -t sogong-ai:$BUILD_NUMBER -t sogong-ai:latest ai' }
                }
            }
        }

        stage('Deploy') {
            when { expression { fileExists('deploy/docker-compose.app.yml') } }
            steps {
                sh 'cp deploy/docker-compose.app.yml $COMPOSE'
                sh '''
                    SVCS=""
                    docker image inspect sogong-backend:latest  >/dev/null 2>&1 && SVCS="$SVCS backend"
                    docker image inspect sogong-ai:latest       >/dev/null 2>&1 && SVCS="$SVCS ai"
                    docker image inspect sogong-frontend:latest >/dev/null 2>&1 && SVCS="$SVCS frontend"
                    if [ -n "$SVCS" ]; then
                        echo "배포 대상:$SVCS"
                        docker compose -f $COMPOSE up -d $SVCS
                        sleep 10
                        docker compose -f $COMPOSE ps
                    else
                        echo "배포할 이미지가 아직 없습니다 - 건너뜁니다"
                    fi
                '''
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
