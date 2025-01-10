# Data Sources
data "aws_availability_zones" "available" {
  state = "available"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "lambda_runtime" {
  description = "Lambda runtime"
  type        = string
  default     = "nodejs18.x"
}

variable "lambda_memory" {
  description = "Lambda memory size"
  type        = number
  default     = 256
}

variable "lambda_timeout" {
  description = "Lambda timeout"
  type        = number
  default     = 30
}

variable "domain_name" {
  description = "API domain name"
  type        = string
  default     = "api.cybergolem.io"
}

variable "ecr_repository" {
  description = "ECR repository name"
  type        = string
  default     = "gollem-lob"
}

# Environment
variable "environment" {
  description = "Deployment environment (dev/staging/production)"
  type        = string
  default     = "dev"
}

# Payment System Variables
variable "stripe_secret_name" {
  description = "Name of the Secrets Manager secret for Stripe credentials"
  type        = string
  default     = "gollem/stripe"
}

variable "user_table_name" {
  description = "Name of the DynamoDB table for user accounts"
  type        = string
  default     = "gollem-user-accounts"
}

variable "ledger_table_name" {
  description = "Name of the DynamoDB table for credit ledger"
  type        = string
  default     = "gollem-credit-ledger"
}

variable "credit_to_usd_rate" {
  description = "Conversion rate from credits to USD"
  type        = number
  default     = 0.001
}

variable "provider_payout_threshold" {
  description = "Minimum amount in USD for provider payouts"
  type        = number
  default     = 100.00
}

# Local variable definitions for resource naming
locals {
  stripe_secret_name = coalesce(
    var.stripe_secret_name,
    "/gollem/${var.environment}/stripe/api-keys"
  )
  
  user_table_name = coalesce(
    var.user_table_name,
    "gollem-${var.environment}-user-accounts"
  )
  
  ledger_table_name = coalesce(
    var.ledger_table_name,
    "gollem-${var.environment}-credit-ledger"
  )
}