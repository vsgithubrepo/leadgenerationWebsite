# 🏭 Lead Generation Engine

A professional React application designed to generate, filter, and export B2B leads for logistics, manufacturing, and transport sectors in India.

## 🚀 Features
* **Smart Lead Generation**: Generates realistic B2B leads with companies, contacts, and contact info.
* **Segment Filtering**: Filter by 3PL, Manufacturing, Importers/Exporters, and Fleet Owners.
* **Quality Scoring**: AI-driven scoring system (Hot/Warm/Cold) based on data completeness.
* **CSV Export**: One-click export to Excel/CSV for sales teams.
* **Secure Authentication**: User login and management powered by Clerk.

## 🛠️ Tech Stack
* **Frontend**: React.js
* **Styling**: Premium Glassmorphism UI (CSS-in-JS)
* **Auth**: Clerk
* **Deployment**: Vercel

## 💻 How to Run Locally

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/vsgithubrepo/leadgenerationWebsite.git](https://github.com/vsgithubrepo/leadgenerationWebsite.git)
    cd leadgenerationWebsite
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Setup Environment Variables**
    Create a `.env` file in the root directory and add your Clerk keys:
    ```env
    REACT_APP_CLERK_PUBLISHABLE_KEY=your_key_here
    ```

4.  **Start the App**
    ```bash
    npm start
    ```

## 📂 Project Structure
```text
├── public/          # Static assets (images, index.html)
├── src/             # Main React application code
│   ├── LeadEngine.js # Core logic and UI
│   ├── App.js       # Main routing and auth wrapper
├── .gitignore       # Security rules
└── package.json     # Project dependencies