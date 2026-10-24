// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dihwzmbfccjekcfoxsdr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpaHd6bWJmY2NqZWtjZm94c2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3ODQ2MzIsImV4cCI6MjEwODM2MDYzMn0.tCSD03RleLxbsC3RJzBkoC89_QSr7JampngJGe_Ak74'

export const supabase = createClient(supabaseUrl, supabaseKey)