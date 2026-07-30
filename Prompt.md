You are the lead software architect and senior full-stack engineer.

Your task is to build a production-ready mobile application called ANVESA.

Do NOT build an MVP.

Build something that could scale to millions of users.

Everything should be modular, reusable and enterprise-grade.

========================================================

PROJECT

ANVESA

Tagline:

Buy what's verified, not what's marketed.

ANVESA is NOT a scanner app.

ANVESA is a clean-food marketplace where every product is verified using an objective grading system.

The scanner is simply one feature that feeds the marketplace.

The marketplace is the hero.

========================================================

TECH STACK

Frontend

• React Native

• Expo

• Expo Router

• Typescript

• Zustand

• React Query

• React Hook Form

• Zod

• Reanimated

• MMKV

• FlashList

Backend

• NextJS 15 App Router

• TypeScript

• tRPC

• Prisma

• Supabase PostgreSQL

• Supabase Storage

• Supabase Auth

• Redis cache

Payments

• Razorpay

Notifications

• OneSignal

Maps

• Google Maps

Scanner

• Vision Camera

• Barcode Scanner

• OCR

AI

Anthropic Claude API

========================================================

ARCHITECTURE

Use Clean Architecture.

Presentation

↓

Application

↓

Domain

↓

Infrastructure

Never place business logic inside components.

Everything should be service driven.

========================================================

DESIGN SYSTEM

Minimal

Premium

Apple inspired

Lots of whitespace

Rounded cards

Large imagery

Elegant typography

Animations should be subtle.

Dark mode supported.

========================================================

COLOR PALETTE

Primary

Purple

Secondary

Green

Background

White

Typography

Inter

========================================================

DATABASE

Design a normalized production-ready schema.

Tables should include:

users

profiles

addresses

categories

brands

products

product_images

product_variants

nutrition

ingredients

product_grade

grade_reasoning

product_flags

orders

order_items

payments

wallet

wallet_transactions

subscriptions

subscription_items

bundles

bundle_products

xp

badges

streaks

scan_history

scan_rewards

coupons

newsletter_articles

saved_products

recently_viewed

notifications

device_tokens

feedback

audit_logs

admins

vendors

delivery_slots

pincodes

affiliate_links

========================================================

AUTH

OTP Login

Guest checkout

Apple Login

Google Login

========================================================

MAIN TABS

Marketplace

Scanner

Rewards

Orders

Profile

========================================================

MARKETPLACE

This is the homepage.

Products are grouped by

Breakfast

Snacks

Beverages

Staples

Kids

Protein

Organic

Dairy

Healthy Alternatives

Every product card displays

Image

Grade

Brand

Price

Discount

Quick Add

Wishlist

========================================================

PRODUCT PAGE

Large images

Nutrition panel

Ingredients

Grade

Grade explanation

Why it received the grade

Red flags

Better alternatives

Reviews

Related products

========================================================

SCANNER

Scan barcode

or

Food label

Show

Product grade

Ingredient analysis

Red flags

Nutrition

Health summary

Three better alternatives

If available

Buy from ANVESA

Else

Amazon Affiliate

========================================================

FILTERS

Low Sugar

Low Sodium

High Protein

Low Fat

High Fibre

Kids Safe

Diabetic Friendly

Weight Loss

Heart Friendly

Gluten Free

========================================================

HEALTH PROFILE

Age

Gender

Height

Weight

Health Conditions

Goals

Activity Level

Diet

========================================================

SHOPPING

Cart

Coupons

Wallet

Checkout

Address

Delivery Slot

Payment

Order Confirmation

Order Tracking

========================================================

DELIVERY

Initially only allow delivery within

5KM

around

CDS Corporate

Cyber Park

Gurugram

If outside area

Collect pincode

Notify user later

========================================================

SUBSCRIPTIONS

Milk

Bread

Eggs

Vegetables

Fruits

2-day recurring deliveries

Pause

Resume

Cancel

========================================================

FUNCTIONAL BUNDLES

Weight Loss

High Protein

Kids Nutrition

Gut Friendly

Diabetic

Heart Health

Bundles may include products from multiple brands.

========================================================

REWARDS

Satya XP

Badges

Achievements

Scan streak

Purchase streak

Coupons

Wallet Cashback

Leaderboard

========================================================

NEWSLETTER

Weekly articles

Saved articles

Sharing

Reading progress

========================================================

ADMIN PANEL

Products

Brands

Grades

Orders

Customers

Coupons

Newsletter

XP

Bundles

Subscriptions

Analytics

Vendor Management

========================================================

IMPORTANT BUSINESS RULES

The grading algorithm must NEVER depend on:

Advertising

Sponsored listings

Payments

Brand partnerships

A brand may pay for listing.

A brand may NEVER pay for a higher grade.

This rule must be enforced at the backend.

========================================================

PERFORMANCE

Infinite scrolling

Image caching

Offline cache

Optimistic updates

Lazy loading

Pagination

Redis caching

Database indexes

========================================================

SECURITY

JWT

Refresh Tokens

Row Level Security

Signed Upload URLs

Rate limiting

Helmet

Validation

Audit logs

========================================================

CODE QUALITY

Strict TypeScript

ESLint

Prettier

Unit tests

Integration tests

Repository pattern

Dependency Injection

Reusable UI components

========================================================

DELIVERABLES

Generate

Complete folder structure

Database schema

Prisma schema

Supabase SQL

API routes

tRPC routers

Authentication

Reusable components

React Native screens

Navigation

Hooks

Utilities

Theme

Design system

State management

Repository layer

Service layer

Admin dashboard

README

Deployment guide

Seed scripts

Dummy data

CI/CD pipeline

GitHub Actions

Docker configuration

Everything should be production-ready.

========================================================

DESIGN PHILOSOPHY

The visual language should be a fusion of Modern Minimalism and Soft Neo Brutalism.

Think:

• Apple Human Interface
• Linear
• Arc Browser
• Notion Calendar
• Raycast
• Slight Neo Brutalist influence

Avoid extreme neo brutalism.

Do NOT use oversized black borders everywhere.

The UI should feel premium, clean, trustworthy and playful.

The experience should feel modern in 2026 rather than trendy.

The goal is to create a memorable identity without sacrificing usability.

========================================================

DESIGN PRINCIPLES

• Large rounded corners (20-32px)
• Thick borders only on important interactive elements
• Soft elevation instead of harsh shadows
• Cards floating over spacious layouts
• Lots of whitespace
• Large imagery
• Bold typography hierarchy
• Smooth micro interactions
• Playful but professional
• Friendly illustrations
• Fast feeling UI
• Zero clutter

========================================================

VISUAL STYLE

Cards

• Rounded
• Thick border (2px max)
• Soft drop shadow
• Slight offset shadows only on important CTAs

Buttons

• Rounded pill buttons
• Slight elevation
• Press animation
• No glassmorphism

Inputs

• Rounded
• Large height
• Soft borders
• Filled background

Badges

• Bold
• Rounded
• Color coded

Product Cards

Large product image

Grade badge floating

Brand

Price

Quick Add button

Favourite icon

Rounded corners

========================================================

COLOR STYLE

Primary Purple

Accent Green

Warm White background

Pure Black text

Light Gray surfaces

Success Green

Warning Orange

Error Red

No gradients unless subtle.

Avoid excessive colors.

The interface should rely on typography and spacing more than decoration.

========================================================

TYPOGRAPHY

Use Inter Variable.

Hierarchy

Display

Heading

Title

Body

Caption

Bold only where necessary.

Readable.

Accessible.

========================================================

ICONS

Lucide Icons

or

Phosphor Icons

Rounded variants only.

========================================================

SPACING SYSTEM

8pt grid

8

12

16

20

24

32

48

64

Consistent throughout the application.

========================================================

ANIMATIONS

Every interaction should feel alive.

Use

Reanimated

Spring animations

Card lift on press

Button bounce

Page transitions

Shared element transitions

Scanner opening animation

XP reward animations

Coupon unlock animation

Cart success animation

Do not over animate.

Everything should feel polished.

========================================================

IMAGERY

Large product photography.

Minimal backgrounds.

Rounded images.

Never use stock-looking illustrations.

========================================================

ACCESSIBILITY

AA compliant

Dynamic font sizes

VoiceOver support

TalkBack support

Large touch targets

High contrast mode

========================================================

DO NOT

❌ Sharp rectangles

❌ Tiny buttons

❌ Excessive gradients

❌ Heavy glassmorphism

❌ Material Design clones

❌ Bootstrap style UI

❌ Excessive black borders

❌ Overly colorful layouts

❌ Crowded dashboards

========================================================

INSTEAD CREATE

A design system that feels like if Apple designed a Neo Brutalist grocery marketplace.

Minimal.

Elegant.

Rounded.

Friendly.

Premium.

Confident.

Fast.

Memorable.