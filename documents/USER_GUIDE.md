# Garments ERP - User Guide

## Introduction
Welcome to the Garments ERP system. This tool helps manage the entire garment manufacturing process, providing real-time visibility into employees, orders, machines, and production status.

## Getting Started
The system is divided into several clear modules based on your role.

### 1. For HR Managers
*   **Employee Registration**: Add new staff in the `Employees` section. Ensure you assign them a unique QR ID and Token Number.
*   **Line Assignment**: Assign sewing operators to specific **Production Lines**. This is crucial for tracking who produced what.
*   **Shifts**: Define shift timings (General, Night) to manage attendance intervals.

### 2. For Merchandisers
*   **Create Orders**: Enter new Buyer Orders (PO) details including Buyer, Brand, Style, and Season.
*   **Size Breakdown**: Define exactly how many pieces of each size (S, M, L, XL, etc.) are required for the order.

### 3. For Production Managers & Cut Masters
*   **Cutting**:
    *   Create a "Lay" plan.
    *   Record the total pieces cut for a specific Style and Size.
*   **Bundling**:
    *   The system acts as a "Bundle Generator".
    *   It breaks down the cut fabric into bundles (standard size 20 or custom).
    *   **Action**: Print and attach the generated RFID/QR tags to the physical bundles.

### 4. For Industrial Engineers (IE)
*   **Style Setup**: Create `Style Masters` for new designs.
*   **Operation Bulletin**: Define the sequence of operations (e.g., Shoulder Join -> Neck Join) and the Standard Allowed Minutes (SAM) for each.
*   **Line Balancing**: Use the `Line` and `Machine` data to optimize layout.

### 5. For Maintenance Team
*   **Asset Mgmt**: Register all machines with their unique Asset IDs.
*   **Service Logs**: Whenever a machine breaks down or is serviced, log the event in the `Machine Services` module to track downtime.

## Daily Workflows
*   **Operator Workflow**: Workers scan the Bundle Tag when they start and finish their assigned operation.
*   **Management View**: Use the Dashboard to see:
    *   **WIP**: How many pieces are currently on the line?
    *   **Bottlenecks**: Which operation is slowing down production?
    *   **Targets**: Are we meeting the daily production goal?
