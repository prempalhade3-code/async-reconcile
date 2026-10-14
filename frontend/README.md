# asyncreconcile frontend

the user interface for asyncreconcile: an interactive verification cockpit and evaluation studio for asynchronous it operations.

## tech stack
- **react 19** with typescript
- **vite** development server and bundler
- **tailwind css v4** for design token styling
- **motion** for spring physics and hardware-accelerated animations
- **recharts** for empirical mode comparison visualizations
- **lucide-react** for iconography
- **sonner** for lightweight notifications

## local development
```bash
# install dependencies
npm install

# start dev server
npm run dev

# type check and build
npm run build
```

the development server runs on `http://localhost:5173` with proxy configuration forwarding `/api` calls to the fastapi backend at `http://127.0.0.1:8000`.
