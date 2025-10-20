# Report Copilot

Report Copilot is an AI-powered dashboard that lets users query structured data (customers, bookings, products, etc.) in plain English and automatically visualizes results in tables and charts.

## Flow

- User enters a question in plain English.
- Backend sends the question + DB schema to the OpenAI model.
- OpenAI returns a JSON query (SQL or Mongo filter) + description of data to display.
- Backend runs the query on your database.
- Results are sent to frontend for display in:
    📊 a data table
    📈 a dynamic chart (bar, line, pie, etc.)

## Installation

```bash
# Clone the repository
git clone https://github.com/WebApp1018/Report-Copilot.git

# Install dependencies
npm install
```

## Usage

```bash
npm run dev
```

## Seed
```bash
set SEED_CHUNK_SIZE=1000
node seed.js --from=2021-01-01 --to=2025-10-20 --customers=500 --products=300 --orders=5000 --bookings=2000
```

## Contributing

Contributions are welcome! Please open issues or submit pull requests.

## License

This project is licensed under the MIT License.