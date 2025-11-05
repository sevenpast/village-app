-- Migration: Create apartment_viewings and viewing_photos tables for Housing Vault
-- These tables store apartment viewing information and associated photos

-- Apartment Viewings Table
CREATE TABLE IF NOT EXISTS public.apartment_viewings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  viewing_date DATE NOT NULL,
  rent_chf INTEGER,
  room_count DECIMAL(3, 1),  -- e.g., 2.5, 3.5, 4.0
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  
  -- Ratings (1-5)
  rating_condition INTEGER CHECK (rating_condition BETWEEN 1 AND 5),
  rating_neighborhood INTEGER CHECK (rating_neighborhood BETWEEN 1 AND 5),
  rating_commute INTEGER CHECK (rating_commute BETWEEN 1 AND 5),
  rating_amenities INTEGER CHECK (rating_amenities BETWEEN 1 AND 5),
  rating_value INTEGER CHECK (rating_value BETWEEN 1 AND 5),
  
  -- Computed overall rating
  rating_overall DECIMAL(3, 1) GENERATED ALWAYS AS (
    CASE 
      WHEN rating_condition IS NOT NULL 
        AND rating_neighborhood IS NOT NULL 
        AND rating_commute IS NOT NULL 
        AND rating_amenities IS NOT NULL 
        AND rating_value IS NOT NULL
      THEN (rating_condition + rating_neighborhood + rating_commute + rating_amenities + rating_value) / 5.0
      ELSE NULL
    END
  ) STORED,
  
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Viewing Photos Table
CREATE TABLE IF NOT EXISTS public.viewing_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewing_id UUID NOT NULL REFERENCES public.apartment_viewings(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_viewings_user_id ON public.apartment_viewings(user_id);
CREATE INDEX IF NOT EXISTS idx_viewings_rating ON public.apartment_viewings(rating_overall DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_viewings_date ON public.apartment_viewings(viewing_date DESC);
CREATE INDEX IF NOT EXISTS idx_viewing_photos_viewing_id ON public.viewing_photos(viewing_id);
CREATE INDEX IF NOT EXISTS idx_viewing_photos_order ON public.viewing_photos(viewing_id, display_order);

-- Updated_at trigger for apartment_viewings
DROP TRIGGER IF EXISTS trg_viewings_updated_at ON public.apartment_viewings;
CREATE TRIGGER trg_viewings_updated_at
BEFORE UPDATE ON public.apartment_viewings
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Enable RLS
ALTER TABLE public.apartment_viewings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewing_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for apartment_viewings

-- Policy: Users can view their own viewings
CREATE POLICY "Users can view own viewings"
ON public.apartment_viewings FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Users can insert their own viewings
CREATE POLICY "Users can insert own viewings"
ON public.apartment_viewings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own viewings
CREATE POLICY "Users can update own viewings"
ON public.apartment_viewings FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own viewings
CREATE POLICY "Users can delete own viewings"
ON public.apartment_viewings FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for viewing_photos

-- Policy: Users can view photos of their own viewings
CREATE POLICY "Users can view own viewing photos"
ON public.viewing_photos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.apartment_viewings
    WHERE apartment_viewings.id = viewing_photos.viewing_id
    AND apartment_viewings.user_id = auth.uid()
  )
);

-- Policy: Users can insert photos for their own viewings
CREATE POLICY "Users can insert own viewing photos"
ON public.viewing_photos FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.apartment_viewings
    WHERE apartment_viewings.id = viewing_photos.viewing_id
    AND apartment_viewings.user_id = auth.uid()
  )
);

-- Policy: Users can update photos of their own viewings
CREATE POLICY "Users can update own viewing photos"
ON public.viewing_photos FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.apartment_viewings
    WHERE apartment_viewings.id = viewing_photos.viewing_id
    AND apartment_viewings.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.apartment_viewings
    WHERE apartment_viewings.id = viewing_photos.viewing_id
    AND apartment_viewings.user_id = auth.uid()
  )
);

-- Policy: Users can delete photos of their own viewings
CREATE POLICY "Users can delete own viewing photos"
ON public.viewing_photos FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.apartment_viewings
    WHERE apartment_viewings.id = viewing_photos.viewing_id
    AND apartment_viewings.user_id = auth.uid()
  )
);


