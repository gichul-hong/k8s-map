# k8s-map: Code Explanation

This document provides a detailed explanation of the structure and code of the `k8s-map` project.

## Project Structure

The project follows a standard Next.js App Router structure.

-   `/src`: Contains all the source code for the application.
    -   `/app`: The main application directory for Next.js.
        -   `/api`: Contains backend API routes.
            -   `/k8s/nodes/route.ts`: API endpoint to fetch Kubernetes node information.
            -   `/prometheus/metrics/route.ts`: API endpoint to fetch resource metrics from Prometheus.
        -   `/page.tsx`: The main frontend component for the homepage.
        -   `/layout.tsx`: The root layout for the application.
    -   `/components`: Contains reusable React components.
        -   `/ResourceGrid.tsx`: A component to visualize resource usage as a grid.
-   `/.env.local`: (To be created by user) For storing environment variables like `PROMETHEUS_URL`.
-   `/README.md`: Contains project setup and testing instructions.

## Frontend Breakdown

### 1. Main Page (`/src/app/page.tsx`)

This is the primary user interface of the application.

-   **State Management:** Uses `useState` to manage:
    -   `nodes`: An array of node data after combining information from both Kubernetes and Prometheus APIs.
    -   `loading`/`error`: Standard state for handling asynchronous data fetching.
    -   `selectedNode`: Stores the data of the currently selected node to display in the details modal.

-   **Data Fetching:**
    -   Uses `useEffect` to fetch data from the internal API routes (`/api/k8s/nodes` and `/api/prometheus/metrics`) when the component mounts.
    -   `Promise.all` is used to fetch from both endpoints concurrently.
    -   After fetching, it combines the node information (from Kubernetes) and the usage metrics (from Prometheus) into a single `CombinedNodeData` object for each node. This is done by matching `node.name` with `metric.node`.

-   **Rendering Logic:**
    -   It maps over the `nodes` array to render a card for each Kubernetes node.
    -   Each card displays the node name and uses the `ResourceGrid` component to show a visual breakdown of CPU, Memory, and GPU usage.
    -   **Click Handler:** Each node card has an `onClick` handler that sets the `selectedNode` state, which in turn triggers the display of the details modal.
    -   **Modal/Overlay:** When `selectedNode` is not null, a modal is rendered to show detailed information, including a breakdown of all MIG profiles for GPUs.

### 2. ResourceGrid Component (`/src/components/ResourceGrid.tsx`)

This is a reusable component designed for data visualization.

-   **Props:**
    -   `label`: The name of the resource (e.g., "CPU", "Memory").
    -   `percentage`: The usage percentage (0-100).
    -   `total`: The total number of cells the grid should be divided into.
-   **Functionality:**
    -   For CPU and Memory, `total` is hardcoded to `10` in `page.tsx`.
    -   For GPU, `total` is the total number of GPU resources (e.g., 4 for a node with 4 GPUs, or the sum of MIG capacities).
    -   It calculates the number of cells to fill based on the usage percentage: `filledCells = Math.round((percentage / 100) * total)`.
    -   It renders a grid of `total` cells, coloring the `filledCells` with a heatmap color (green to red) and leaving the rest gray.

## Backend (API Routes) Breakdown

The API routes are responsible for fetching data from the actual data sources. They contain logic to switch between serving dummy data for testing and fetching live data.

### 1. Kubernetes Nodes (`/src/app/api/k8s/nodes/route.ts`)

-   **Dummy Data Mode:** Returns a hardcoded array of node objects. This data is structured to simulate real-world scenarios, including nodes with multiple MIG profiles and nodes without any GPUs.
-   **Live Data Mode:**
    -   Uses the `@kubernetes/client-node` library.
    -   `kc.loadFromDefault()`: Automatically loads configuration from the default `kubeconfig` file (`~/.kube/config`) or from the in-cluster service account if deployed inside a Kubernetes pod.
    -   It calls `k8sApi.listNode()` to get a list of all cluster nodes.
    -   It iterates through each node's `status.capacity` and `status.allocatable` fields to find all resources with the prefix `nvidia.com/`. This allows it to dynamically find both non-MIG GPUs (`nvidia.com/gpu`) and any type of MIG device (`nvidia.com/mig-*`).
    -   The found GPU resources are structured into a `gpus` object for each node.

### 2. Prometheus Metrics (`/src/app/api/prometheus/metrics/route.ts`)

-   **Dummy Data Mode:** Returns a hardcoded array of metrics corresponding to the dummy nodes, including usage percentages for CPU, Memory, and specific MIG/GPU profiles.
-   **Live Data Mode:**
    -   It reads the `PROMETHEUS_URL` from environment variables.
    -   `queryPrometheus()`: A helper function that uses `fetch` to send a PromQL query to the Prometheus HTTP API.
    -   **Queries:** It runs queries for CPU, Memory, and GPU usage. The GPU query (`avg by (instance, gpu, mig_profile) (dcgm_gpu_utilization)`) is designed to get usage for all GPU devices, and it expects labels that can differentiate them (like `gpu` for the index and `mig_profile` for MIG type).
    -   **Parsing Logic:** It processes the results from Prometheus and maps them to the correct node and resource type. It's designed to handle metrics that have a `mig_profile` label (for MIG devices) and those that don't (for non-MIG GPUs), mapping them to the appropriate key (e.g., `nvidia.com/mig-1g.5gb` or `nvidia.com/gpu`) in the final `gpus` object.

This concludes the detailed explanation of the project's code.
