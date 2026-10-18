// Cấu hình Supabase cho Tu Tiên Online — GẮN Ở MILESTONE 2 (bản online)
// Project: tu-tien-online | Org: tutien (Free) | Region: Singapore (ap-southeast-1)
// Tạo ngày 2026-10-18. anon key là public, dùng trong client được.
// DB password KHÔNG nằm ở đây — reset qua Dashboard → Database Settings khi cần.
var SUPABASE_CONFIG = {
  url: "https://cifpkmxkrtdowdjvrzls.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZnBrbXhrcnRkb3dkanZyemxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyOTE0MzQsImV4cCI6MjEwNzg2NzQzNH0.Et7vkX7HxvzIPTmJ0z-JlTVz8blXxryFFmx1akDxi58",
  enabled: false // bật true ở milestone 2 khi online.js cắm Supabase thật
};
