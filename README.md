This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

---

## k8s-map

### Testing with Dummy Data

The API routes are currently configured to provide mock data for testing without a live Kubernetes or Prometheus connection. Simply run `npm run dev` to see the application with this dummy data.

### Switching to Live Data

When you are ready to connect to your live Kubernetes and Prometheus instances, follow these steps:

1.  **Configure Kubernetes Access:** Ensure your `kubeconfig` file is correctly set up in `~/.kube/config` or another default location.

2.  **Configure Prometheus URL:** Create a `.env.local` file in the project root with the following content, replacing the URL with your Prometheus instance's URL:
    ```
    PROMETHEUS_URL=http://your-prometheus-instance:9090
    ```

3.  **Update API Routes:** Modify the following files to switch from dummy data to live data fetching logic.

    -   **In `src/app/api/k8s/nodes/route.ts`**:
        -   Comment out or remove the "Dummy Data Section".
        -   Uncomment the "Original Live Data Logic" section at the bottom.
        -   Uncomment the `import * as k8s from '@kubernetes/client-node';` line.

    -   **In `src/app/api/prometheus/metrics/route.ts`**:
        -   Comment out or remove the "Dummy Data Section".
        -   Uncomment the "Original Live Data Logic" section at the bottom.
        -   Uncomment the `const PROMETHEUS_URL = ...` line.

### Prometheus Metric Assumptions (for MIG)

The live data logic for Prometheus assumes that your metrics for MIG devices follow this pattern:
-   **Metric Name:** `dcgm_gpu_utilization` (or similar)
-   **Labels:** The metric must have a label to distinguish between MIG profiles. The code currently assumes a label named `mig_profile`.

If your setup uses different metric names or labels, you will need to adjust the `gpuQuery` in `src/app/api/prometheus/metrics/route.ts` accordingly.


## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.