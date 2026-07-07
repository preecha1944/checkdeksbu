# คู่มือติดตั้งระบบเช็คชื่อและตัดเกรดนักศึกษา

คู่มือนี้พาไปตั้งแต่สร้างฐานข้อมูล Supabase จนถึง deploy ขึ้น Vercel

---

## 1. สร้างโปรเจกต์ Supabase

1. ไปที่ https://supabase.com → เข้าสู่ระบบ/สมัครสมาชิก
2. กด **New project** ตั้งชื่อโปรเจกต์ เลือก Region (แนะนำ Singapore เพราะใกล้ไทยที่สุด) ตั้งรหัสผ่านฐานข้อมูล แล้วกด **Create new project**
3. รอสักครู่จนโปรเจกต์พร้อมใช้งาน

## 2. รันไฟล์ Schema

1. ในเมนูซ้ายของ Supabase Dashboard เลือก **SQL Editor**
2. กด **New query**
3. เปิดไฟล์ `supabase/schema.sql` ในโปรเจกต์นี้ คัดลอกทั้งหมด แล้ววางในหน้า SQL Editor
4. กด **Run** — ระบบจะสร้างตารางทั้งหมด, trigger สำหรับสร้าง profile อัตโนมัติ, ห้องเรียนเริ่มต้น 2 ห้อง (ห้อง 1 / ห้อง 2) และเปิด Row Level Security ให้ทุกตาราง
5. หากรันซ้ำจะไม่ error (ใช้ `if not exists` เกือบทุกจุด) ยกเว้นบาง statement ที่ไม่กระทบข้อมูลเดิม

## 3. สร้างผู้ใช้คนแรก (จะกลายเป็น Admin อัตโนมัติ)

1. ไปที่เมนู **Authentication → Users**
2. กด **Add user** → **Create new user**
3. กรอกอีเมลและรหัสผ่าน แล้ว **ติ๊กเลือก "Auto Confirm User"** (สำคัญมาก มิฉะนั้นจะ login ไม่ได้เพราะยังไม่ยืนยันอีเมล)
4. กด **Create user**
5. ระบบมี trigger `on_auth_user_created` ที่จะสร้างแถวใน `profiles` ให้อัตโนมัติ — **ผู้ใช้คนแรกที่ถูกสร้างในระบบจะได้ role `admin` โดยอัตโนมัติ** ผู้ใช้คนถัดไปจะเป็น `teacher` เป็นค่าเริ่มต้น (สามารถแก้ role ได้ทีหลังโดยตรงในตาราง `profiles` ผ่าน Table Editor)

## 4. คัดลอกค่า Environment Variables

1. ในเมนู **Project Settings → API** ของ Supabase จะเห็น:
   - **Project URL** → ใช้เป็น `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → ใช้เป็น `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (กด Reveal เพื่อดู) → ใช้เป็น `SUPABASE_SERVICE_ROLE_KEY` (เก็บเป็นความลับ ห้ามเผยแพร่ ห้าม commit ขึ้น git เด็ดขาด เพราะ key นี้ข้าม RLS ได้ทั้งหมด)
2. คัดลอกไฟล์ `.env.local.example` เป็น `.env.local` (อยู่ root ของโฟลเดอร์ `attendance-app`)
3. กรอกค่าให้ครบ 4 ตัว:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxx
   SUPABASE_SERVICE_ROLE_KEY=xxxxxxxxxxxxxxxx
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   > `NEXT_PUBLIC_APP_URL` ใช้สร้างลิงก์ในหน้า QR (`/scan?sid=...&t=...`) — ตอนพัฒนาในเครื่องให้ใช้ `http://localhost:3000` ตอน deploy จริงต้องเปลี่ยนเป็นโดเมนจริง (ดูขั้นตอนที่ 6)

## 5. รันโปรเจกต์บนเครื่อง

```bash
cd attendance-app
npm install   # ถ้ายังไม่เคยติดตั้ง
npm run dev
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:3000` → ระบบจะพาไปหน้า `/login` (ถ้ายังไม่ login) → login ด้วยอีเมล/รหัสผ่านที่สร้างไว้ในขั้นตอนที่ 3

## 6. Deploy ขึ้น Vercel

1. Push โค้ดขึ้น GitHub (หรือ GitLab/Bitbucket)
2. ไปที่ https://vercel.com → **Add New → Project** → เลือก repo นี้ → เลือกโฟลเดอร์ `attendance-app` เป็น Root Directory (ถ้า repo มีหลายโฟลเดอร์)
3. ในหน้า **Environment Variables** ตั้งค่าตัวแปรทั้ง 4 ตัวให้ตรงกับ `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` → **ใส่โดเมนจริงที่ Vercel จะให้ เช่น `https://your-app.vercel.app`** (แก้ทีหลังได้ถ้ายังไม่รู้โดเมน แล้ว redeploy อีกครั้ง)
4. กด **Deploy**
5. หลัง deploy เสร็จ ให้กลับไปตรวจสอบค่า `NEXT_PUBLIC_APP_URL` ว่าตรงกับโดเมนจริงหรือไม่ (มีผลกับลิงก์ QR ที่นักศึกษาสแกน) ถ้าใช้โดเมนของตัวเอง (custom domain) ให้เปลี่ยนค่านี้เป็นโดเมนนั้นแล้ว **Redeploy**

## 7. ทดสอบเบื้องต้นหลัง deploy

- เข้า `/login` ด้วยบัญชี admin ที่สร้างไว้ → ควรเข้าสู่ระบบและถูกพาไป `/dashboard`
- ลองเข้า `/dashboard` โดยไม่ login (เปิด private window) → ต้องถูก redirect กลับไป `/login`
- ดูรายละเอียดการทดสอบเต็มรูปแบบเพิ่มเติมได้ที่หัวข้อ "Manual Test Checklist" ใน `IMPLEMENTATION-PLAN.md`

---

## หมายเหตุด้านความปลอดภัย

- ห้าม commit ไฟล์ `.env.local` ขึ้น git (มี `.gitignore` ป้องกันไว้แล้ว)
- `SUPABASE_SERVICE_ROLE_KEY` ใช้ในฝั่งเซิร์ฟเวอร์เท่านั้น ห้ามนำไปใช้ในโค้ดฝั่ง client หรือเปิดเผยที่ใดก็ตาม
- ทุกตารางเปิด Row Level Security (RLS) ไว้แล้วแต่ไม่มี policy ให้ client (anon key) เขียนหรืออ่านได้โดยตรง ยกเว้นตาราง `profiles` ที่ผู้ใช้อ่านข้อมูลของตัวเองได้ — การเข้าถึงข้อมูลทั้งหมดต้องผ่าน API ของแอปที่ใช้ service role key เท่านั้น
