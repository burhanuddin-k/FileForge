# 🚀 FileForge — AWS + Docker + Jenkins CI/CD

FileForge is a web-based file management application deployed using a complete DevOps workflow.

This project demonstrates how to build, containerize, automate, and deploy a web application using **GitHub, Jenkins, Docker, Docker Hub, AWS EC2, Nginx, Node.js, and MySQL**.

---

## 📌 Project Overview

FileForge is deployed using a containerized architecture where:

- GitHub stores the source code.
- Jenkins automatically builds the application.
- Docker packages the application into a container.
- Docker Hub stores the Docker image.
- AWS EC2 hosts the application.
- Nginx acts as a reverse proxy.
- Node.js/Express runs the backend.
- MySQL stores application and user/login data.
- Docker Compose manages the complete application stack.

---

## 🏗️ Architecture

```text
                         ┌─────────────────┐
                         │     GitHub      │
                         │  Source Code    │
                         └────────┬────────┘
                                  │
                              Webhook
                                  │
                                  ▼
                         ┌─────────────────┐
                         │     Jenkins     │
                         │    CI/CD        │
                         └────────┬────────┘
                                  │
                         Docker Build
                                  │
                                  ▼
                         ┌─────────────────┐
                         │   Docker Hub    │
                         │                 │
                         │ FileForge Image │
                         └────────┬────────┘
                                  │
                             Docker Pull
                                  │
                                  ▼
                 ┌─────────────────────────────────┐
                 │            AWS EC2              │
                 │                                 │
                 │   ┌─────────────────────────┐   │
                 │   │       Nginx :80         │   │
                 │   │    Reverse Proxy        │   │
                 │   └────────────┬────────────┘   │
                 │                │                │
                 │                ▼                │
                 │   ┌─────────────────────────┐   │
                 │   │   FileForge App :5000   │   │
                 │   │    Node.js / Express    │   │
                 │   └────────────┬────────────┘   │
                 │                │                │
                 │                ▼                │
                 │   ┌─────────────────────────┐   │
                 │   │      MySQL :3306        │   │
                 │   │     Database Server     │   │
                 │   └────────────┬────────────┘   │
                 │                │                │
                 │          Docker Volume          │
                 │                │                │
                 └────────────────┴────────────────┘