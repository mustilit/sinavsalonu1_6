# Page snapshot

```yaml
- generic [ref=e5]:
  - heading "Giriş Yap" [level=1] [ref=e6]
  - generic [ref=e7]:
    - generic [ref=e8]:
      - generic [ref=e9]: E-posta
      - textbox "ornek@email.com" [ref=e10]: aday@demo.com
    - generic [ref=e11]:
      - generic [ref=e12]: Şifre
      - textbox [ref=e13]: demo123
    - paragraph [ref=e14]: Cannot read properties of undefined (reading 'execute')
    - button "Giriş Yap" [ref=e15] [cursor=pointer]
  - paragraph [ref=e16]:
    - text: Hesabınız yok mu?
    - link "Kayıt ol" [ref=e17] [cursor=pointer]:
      - /url: /Register
  - paragraph [ref=e18]:
    - link "← Ana sayfaya dön" [ref=e19] [cursor=pointer]:
      - /url: /Home
  - paragraph [ref=e20]: "Demo: aday@demo.com veya educator@demo.com — şifre: demo123"
```