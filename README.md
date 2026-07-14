# Campus SnapLock 🔐

A mobile-first web application designed for campus peers to share hidden content. Users get a free 5-second peek, after which the content securely blurs behind a mobile money paywall requiring a 1 GHS fee via Paystack to unlock permanently.

## 🚀 Features
- **Dynamic Campus Feed:** Pulls uploaded campus images dynamically using an async database pipeline.
- **5-Second Peek Protection:** Uses local storage flags to handle expiration states and automatically re-locks media files on refresh.
- **Cloud Media Storage & Row Protection:** Connected directly to a cloud infrastructure backend for scalable image uploads and decentralized storage.
- **Paystack Mobile Money Integration:** Tailored directly for Ghana's mobile ecosystem, supporting inline checkouts across major local telecom networks.

## 🛠️ Built With
- **Frontend Layer:** HTML5, CSS3, Tailwind CSS (via CDN)
- **Cloud Backend & Storage Engine:** Supabase JS v2 Client
- **Payment Processing Layer:** Paystack Inline API (GHS Engine)

## 🗄️ Database Setup (SQL)
To replicate the backend infrastructure table required for the image feed, run the following query inside your database editor:

```sql
create table posts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  caption text,
  image_url text not null
);
