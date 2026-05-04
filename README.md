# Travel Expense Tracker

A simple yet powerful app to split travel expenses among travelers with multiple split modes.

## Features

- **Equal Split**: Automatically split expenses evenly among all travelers
- **Custom Split**: Select specific travelers and split unevenly if needed
- **Categories**: Organize expenses (Food, Transport, Accommodation, etc.)
- **Settlement**: Get minimum transactions needed to settle up
- **Breakdown**: View spending by category and per-person
- **Local Storage**: Data persists automatically in your browser

## Tech Stack

- **Next.js 14**: React framework with built-in optimization
- **React 18**: UI components
- **CSS-in-JS**: Inline styles for portability

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Local Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000 in your browser
```

### Build for Production

```bash
npm run build
npm start
```

## Deployment to Vercel

### Option 1: Git + Vercel Dashboard

1. Push code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/travel-expense-tracker.git
git push -u origin main
```

2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Click "Deploy"

### Option 2: Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy
vercel
```

### Option 3: Manual Upload

1. Visit https://vercel.com/new
2. Select "Project" → "Import Git Repository"
3. Paste your repo URL or connect GitHub account
4. Configure project settings (defaults work fine)
5. Click "Deploy"

## Environment Variables

No environment variables required for basic usage. The app uses browser localStorage for data persistence.

## Project Structure

```
.
├── app/
│   ├── layout.jsx        # Root layout with metadata
│   ├── page.jsx          # Home page entry point
│   ├── tracker.jsx       # Main app component
│   └── globals.css       # Global styles
├── package.json          # Dependencies
├── next.config.js        # Next.js configuration
├── vercel.json           # Vercel deployment config
└── .gitignore            # Git ignore rules
```

## Usage

1. **Setup**: Add travelers and trip details in the Setup tab
2. **Expenses**: Log expenses with amount, category, and who paid
3. **Split**: Choose between equal or custom split per expense
4. **Settlement**: View balances and minimum payment transactions
5. **Breakdown**: Analyze spending by category

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Features Details

### Equal Split
- Automatically divides expense amount equally among all travelers
- Updates when amount or travelers change

### Custom Split
- Select which travelers should be included
- Auto-calculates equal split among selected travelers
- Manually adjust individual shares if needed
- Non-selected travelers contribute $0 to that expense

### Settlement Algorithm
- Uses greedy algorithm to minimize transaction count
- Shows who owes whom and how much
- Optimizes for fewest payments

## Data Persistence

All data is stored in browser localStorage:
- Key: `splitwise-tracker-data`
- Format: JSON
- Scope: Per domain/origin
- Clearing browser data will erase trip data

## Troubleshooting

**Data not saving?**
- Check if browser allows localStorage
- Private/Incognito mode may not persist data
- Try a different browser

**Deployment failed?**
- Ensure Node.js version 18+ is specified in `package.json`
- Check build logs in Vercel dashboard
- Verify `.gitignore` excludes `node_modules` and `.next`

## License

MIT - Feel free to use for personal or commercial projects

## Author

Created for easy travel expense splitting

---

**Ready to deploy?** Push to GitHub and connect to Vercel for instant deployments with every git push!
