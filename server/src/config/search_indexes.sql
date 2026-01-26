-- Database indexes for search performance optimization
-- These indexes improve the performance of the advanced search functionality

-- Individual indexes for each searchable field
CREATE INDEX IF NOT EXISTS idx_orders_style_id ON orders(style_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer);
CREATE INDEX IF NOT EXISTS idx_orders_po ON orders(po);

-- Composite index for common search combinations
CREATE INDEX IF NOT EXISTS idx_orders_search_composite ON orders(style_id, buyer, po);

-- Index for order_id (primary key usually exists, but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_orders_id ON orders(order_id);

-- Index for sorting operations
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Create indexes for ILIKE operations (PostgreSQL specific)
-- These indexes support case-insensitive searches
CREATE INDEX IF NOT EXISTS idx_orders_style_id_ilike ON orders USING gin(style_id gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_ilike ON orders USING gin(buyer gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_po_ilike ON orders USING gin(po gin_trgm_ops);

-- Enable pg_trgm extension if not already enabled (for ILIKE optimization)
CREATE EXTENSION IF NOT EXISTS pg_trgm;