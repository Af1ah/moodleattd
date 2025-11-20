# Moodle Attendance Reports

A modern web application for viewing and managing student attendance reports from Moodle. This system provides teachers and administrators with an intuitive interface to track attendance across courses and cohorts, with support for both direct Moodle integration and LTI (Learning Tools Interoperability) launch.

**Created by:** Muhammed Aflah  
**GitHub:** [@Af1ah](https://github.com/Af1ah)

---

## Prerequisites

Before installation, ensure you have:

- **Node.js** version 18 or higher
- **PostgreSQL** database (for storing user sessions and cached data)
- **Moodle** instance with Web Services enabled
- Administrator access to your Moodle site

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Af1ah/moodleattd.git
cd moodleattd
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

Run the database setup script:

```bash
cd db
bash setup_database.sh
```

This will create necessary tables and indexes for the application.

---

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Moodle Configuration
NEXT_PUBLIC_MOODLE_BASE_URL=https://your-moodle-site.com

# Database Connections
DATABASE_URL=postgresql://username:password@localhost:5432/moodle_db
DIRECT_DATABASE_URL=postgresql://username:password@localhost:5432/moodle_db

# Session Security
NEXTAUTH_SECRET=generate_a_random_secret_key_here
NEXTAUTH_URL=http://localhost:3000

# LTI Configuration (see LTI_GUIDE.md for details)
LTI_CONSUMER_KEY=your_consumer_key
LTI_SHARED_SECRET=your_shared_secret
```

### How to Get Each Variable:

#### NEXT_PUBLIC_MOODLE_BASE_URL
Your Moodle website URL (e.g., `https://moodle.yourschool.com`)

#### DATABASE_URL & DIRECT_DATABASE_URL
PostgreSQL connection strings. Replace:
- `username` - your PostgreSQL username
- `password` - your PostgreSQL password
- `localhost:5432` - your database host and port
- `moodle_db` - your database name

#### NEXTAUTH_SECRET
Generate a random secret key:
```bash
openssl rand -base64 32
```

#### NEXTAUTH_URL
- Development: `http://localhost:3000`
- Production: Your actual domain (e.g., `https://attendance.yourschool.com`)

#### LTI Keys (Optional - only if using LTI)
See [LTI Setup Guide](./LTI_GUIDE.md) for detailed instructions.

---

## Moodle Configuration

### Enable Web Services

1. Login to Moodle as administrator
2. Go to **Site administration** → **Server** → **Web services** → **Overview**
3. Follow each step:
   - Enable web services
   - Enable protocols (REST protocol)
   - Create a specific user (optional but recommended)
   - Check user capability
   - Select a service (or create custom service)
   - Add functions to the service
   - Select a specific user
   - Create token for a user

### Create API Token

1. Go to **Site administration** → **Server** → **Web services** → **Manage tokens**
2. Click **Create token**
3. Select:
   - **User**: Select the user who will access reports
   - **Service**: Choose your web service
4. Click **Save changes**
5. Copy the generated token (you won't see it again)

Users will enter this token when they first login to the application.

---

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm run start
```

---

## Using the Application

### First Time Login

1. Open the application in your browser
2. Enter your **Moodle username** and **password**
3. The system will authenticate you with Moodle

### Viewing Attendance

**For Students:**
- View attendance across all enrolled courses
- Click on any course to see detailed attendance records

**For Teachers/Admins:**
- View class-based reports for assigned cohorts
- View course-specific reports
- Export reports to CSV format

### Features

- Real-time attendance data from Moodle
- Filter and search functionality
- Export reports to CSV
- Responsive design for mobile and desktop
- Automatic caching for improved performance

---

## LTI Integration (Optional)

For embedding this application directly within Moodle courses, see the [LTI Setup Guide](./LTI_GUIDE.md).

---

## Troubleshooting

### Cannot connect to database
- Check your `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Verify database exists and user has permissions

### Invalid Moodle credentials
- Verify username and password are correct
- Check that the user has web service access enabled

### Token not working
- Ensure Web Services are enabled in Moodle
- Check that the token hasn't expired
- Verify the user has necessary capabilities

### Build fails
- Run `npm install` again to ensure all dependencies are installed
- Check Node.js version is 18 or higher: `node --version`
- Clear cache: `rm -rf .next node_modules && npm install`

---

## Support

For issues or questions:
- Check existing issues on GitHub
- Create a new issue with detailed description
- Contact: GitHub [@Af1ah](https://github.com/Af1ah)

---

**Version:** 1.0.0  
**Last Updated:** November 2025
