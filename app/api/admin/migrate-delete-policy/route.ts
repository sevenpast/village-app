import { NextResponse } from 'next/server'

/**
 * Manual DELETE policy migration instructions
 * Since we can't execute DDL through the API easily, this endpoint provides instructions
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'To fix the DELETE issue, run this SQL in your Supabase SQL editor:',
    sql: `
-- Policy: Users can delete their own documents
CREATE POLICY IF NOT EXISTS "Users can delete own documents"
ON public.documents FOR DELETE
TO authenticated
USING (user_id = auth.uid());
    `,
    instructions: [
      '1. Go to your Supabase dashboard',
      '2. Navigate to SQL Editor',
      '3. Paste and run the above SQL',
      '4. Then try deleting documents again'
    ]
  })
}