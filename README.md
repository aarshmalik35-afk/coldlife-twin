# ColdChain Twin
### AI-Powered Digital Twin for Cold-Chain Logistics Monitoring

**ColdChain Twin** is a software-based Digital Twin prototype designed to simulate, visualize and monitor cold-chain logistics operations through an interactive dashboard.

**Live Demo:** [View ColdChain Twin](https://aarshmalik35-afk.github.io/coldlife-twin/)

---

## Project Overview

Cold-chain logistics plays a critical role in transporting temperature-sensitive products such as food, pharmaceuticals and other perishable goods.

Monitoring vehicle conditions, shipment temperatures, refrigeration performance and delivery status across a logistics network can be challenging.

ColdChain Twin addresses this challenge through a simulated digital logistics environment that provides a unified view of fleet and shipment operations.

The application uses simulated operational data to represent changing logistics conditions, identify potential risks and present recommendations through an interactive dashboard.

## Key Features

### Fleet Monitoring
- Monitor simulated fleet operations and vehicle status.
- Visualize vehicle locations through an interactive map.
- Track fuel levels and operational indicators.

### Shipment Monitoring
- View shipment information and delivery status.
- Monitor simulated shipment temperature conditions.
- Identify shipments potentially exposed to temperature-related risks.

### Cooling Unit Health
- Monitor simulated refrigeration-unit health.
- Visualize cooling-system operating conditions.
- Highlight potential equipment-related issues.

### Intelligent Risk Insights
- Evaluate operational conditions using configured risk rules.
- Generate alerts for potential shipment and equipment issues.
- Display recommendations to support shipment prioritization and operational decisions.

### Analytics Dashboard
- Visualize fleet and shipment information.
- Display operational metrics through interactive charts.
- Provide a consolidated overview of logistics conditions.

### Digital Twin Simulation
- Represent a virtual logistics environment.
- Simulate changes in vehicle, shipment and cooling-unit conditions.
- Observe how changing operational states affect risk indicators.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React.js |
| Build Tool | Vite |
| Backend / Database | Supabase |
| Programming Language | Python |
| Frontend Hosting | GitHub Pages |
| Mapping | Leaflet, OpenStreetMap |
| Data Visualization | Recharts |
| API Integration | Supabase Client / REST APIs |
| Version Control | Git and GitHub |

---

## System Architecture

ColdChain Twin follows a modular web application architecture.

1. **Frontend Layer:** React and Vite provide the interactive dashboard and visualization components.
2. **Backend and Data Layer:** Supabase provides hosted database and API functionality for application data.
3. **Simulation Layer:** Python utilities support simulation or data preparation according to the implemented workflow.
4. **Visualization Layer:** Leaflet and Recharts present fleet locations, operational metrics and shipment information.
5. **Deployment Layer:** GitHub Pages hosts the compiled frontend application.

The frontend communicates with Supabase to retrieve and display permitted application data.

> Note: GitHub Pages is used for static frontend hosting. It does not execute Python server-side processes.

---

## Application Preview

Add screenshots of your actual application below.

| Dashboard Overview | Fleet Monitoring |
|---|---|
| Add dashboard screenshot | Add fleet map screenshot |

| Shipment Monitoring | Analytics and Alerts |
|---|---|
| Add shipment screenshot | Add alerts screenshot |

---

## Deployment

The frontend is deployed using GitHub Pages.

1. Build the React application using Vite.
2. Generate production-ready static assets.
3. Publish the build output through the configured GitHub Pages workflow.
4. Configure Supabase environment variables and appropriate database access policies.

---

## Future Enhancements

- Real-time temperature and humidity monitoring through IoT sensors.
- GPS-based vehicle tracking.
- Predictive analytics for shipment temperature excursions.
- Refrigeration-unit fault prediction.
- Traffic-aware route optimization.
- Historical logistics data analysis.
- Cloud-based processing and scalable telemetry ingestion.

---

## Current Scope and Limitations

ColdChain Twin is currently a software-based prototype that uses simulated fleet and shipment data.

- No physical IoT sensors are currently required.
- Vehicle locations represent simulated positions rather than verified live GPS data.
- Temperature readings represent simulated shipment conditions.
- Risk insights are based on configured rules and conditions, not a validated predictive machine-learning model.
- Real-world deployment would require integration with actual logistics, sensor and tracking infrastructure.

---

B.Tech – Computer Science and Engineering  
IILM University, Gurugram

---

*ColdChain Twin — Bringing visibility and intelligence to temperature-sensitive logistics.*
