# aText Shortcut Example Generator

aText 단축어 파일을 업로드하고 Claude AI를 활용하여 영어 예문을 자동으로 생성하는 웹 애플리케이션입니다.

## 기능

- 📁 aText 파일 업로드 (.atext, .plist)
- 🤖 Claude API를 활용한 영어 예문 생성 (3개, 5개, 7개)
- 📧 생성된 예문 이메일 전송
- 🎨 직관적인 UI/UX

## 설치 및 실행

### 사전 요구사항
- Node.js (v14 이상)
- Claude API Key

### 설치
```bash
npm install
```

### 실행
```bash
npm start
```

서버가 `http://localhost:3000`에서 실행됩니다.

## 사용 방법

1. **Claude API Key 입력**: Claude API Key를 입력합니다.
2. **aText 파일 업로드**: aText 단축어 파일을 업로드합니다.
3. **단축어 선택**: 업로드된 단축어 목록에서 원하는 단축어를 클릭합니다.
4. **예문 개수 선택**: 3개, 5개, 7개 중 원하는 예문 개수를 선택합니다.
5. **예문 생성**: "예문 생성하기" 버튼을 클릭하여 예문을 생성합니다.
6. **이메일 전송**: 받는 사람 이메일을 입력하고 "이메일 전송" 버튼을 클릭합니다.

## API 엔드포인트

### POST /api/upload
aText 파일을 업로드하고 파싱합니다.

**Request:**
- `multipart/form-data`
- `file`: aText 파일

**Response:**
```json
{
  "success": true,
  "shortcuts": [
    {
      "abbreviation": "btw",
      "fullExpression": "by the way"
    }
  ],
  "count": 1
}
```

### POST /api/generate
Claude API를 사용하여 예문을 생성합니다.

**Request:**
```json
{
  "fullExpression": "by the way",
  "count": 3,
  "claudeApiKey": "sk-ant-api03-..."
}
```

**Response:**
```json
{
  "success": true,
  "examples": "1. By the way, did you finish...\n2. ...",
  "fullExpression": "by the way",
  "count": 3
}
```

### POST /api/send-email
생성된 예문을 이메일로 전송합니다.

**Request:**
```json
{
  "email": "example@email.com",
  "subject": "English Examples",
  "body": "Generated examples..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully"
}
```

## 프로젝트 구조

```
atext-shortcut-generator/
├── server.js           # Express 서버
├── package.json        # 프로젝트 설정
├── public/            
│   └── index.html     # 프론트엔드 UI
├── uploads/           # 업로드된 파일 임시 저장 (자동 생성)
└── README.md          # 프로젝트 문서
```

## 기술 스택

- **Backend**: Node.js, Express
- **Frontend**: HTML, CSS, JavaScript
- **APIs**: Claude API (Anthropic)
- **Libraries**: 
  - multer: 파일 업로드
  - plist: aText 파일 파싱
  - axios: HTTP 클라이언트
  - nodemailer: 이메일 전송

## 주의사항

- Claude API Key는 안전하게 보관하세요.
- 현재 이메일 전송 기능은 시뮬레이션 모드입니다. 실제 이메일 전송을 위해서는 `server.js`의 `sendEmail` 함수에서 SMTP 설정을 추가해야 합니다.

## 라이센스

MIT
