# aText Shortcut Example Generator

aText 단축어 파일을 업로드하고 Claude AI를 활용하여 영어 예문을 자동으로 생성하는 웹 애플리케이션입니다.

## 기능

- 🔑 **API Key 테스트**: Claude API Key 유효성 실시간 검증
- 📁 **다중 파일 업로드**: 여러 개의 단축어 파일을 동시에 업로드 (최대 10개)
- 🔄 **다양한 형식 지원**: aText binary, plist (XML), JSON, CSV, 탭 구분 텍스트
- 🎯 **다중 단축어 선택**: 여러 단축어를 선택하여 한 번에 예문 생성
- 🤖 **Claude API 연동**: 영어 예문 자동 생성 (3개, 5개, 7개 옵션)
- 📧 **이메일 전송**: 생성된 예문을 이메일로 전송
- 🎨 **직관적인 UI/UX**: 반응형 디자인과 실시간 피드백
- ✨ **중복 제거**: 동일한 단축어 자동 제거

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
   - 🔍 **API Key 테스트**: 버튼을 클릭하여 API Key가 유효한지 확인할 수 있습니다.
2. **파일 업로드**: 단축어 파일을 선택합니다 (여러 파일 동시 선택 가능).
   - 지원 형식: `.atext`, `.plist`, `.json`, `.csv`, `.txt`
3. **단축어 선택**: 업로드된 단축어 목록에서 원하는 단축어를 클릭합니다.
   - 💡 **다중 선택**: 여러 단축어를 클릭하여 동시에 선택 가능 (토글 방식)
4. **예문 개수 선택**: 3개, 5개, 7개 중 원하는 예문 개수를 선택합니다.
5. **예문 생성**: "예문 생성하기" 버튼을 클릭하여 선택한 모든 단축어의 예문을 생성합니다.
6. **이메일 전송**: 받는 사람 이메일을 입력하고 "이메일 전송" 버튼을 클릭합니다.

## 지원 파일 형식

### 1. aText Binary (Modern Format)
최신 aText 앱에서 내보낸 바이너리 형식의 파일을 지원합니다.
- 제어 문자와 null 바이트가 포함된 바이너리 구조
- JSON 메타데이터가 임베드된 형식
- 예시: `guti.atext`, `certly.atext`

### 2. aText/plist (XML - Legacy Format)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>shortcuts</key>
    <array>
        <dict>
            <key>abbreviation</key>
            <string>btw</string>
            <key>phrase</key>
            <string>by the way</string>
        </dict>
    </array>
</dict>
</plist>
```

### 3. JSON
```json
[
  {
    "abbreviation": "btw",
    "fullExpression": "by the way"
  },
  {
    "abbreviation": "asap",
    "fullExpression": "as soon as possible"
  }
]
```

### 3. CSV
```csv
btw,by the way
asap,as soon as possible
fyi,for your information
```

### 4. 탭 구분 텍스트
```
btw	by the way
asap	as soon as possible
fyi	for your information
```

## API 엔드포인트

### POST /api/test-api-key
Claude API Key의 유효성을 테스트합니다.

**Request:**
```json
{
  "claudeApiKey": "sk-ant-api03-..."
}
```

**Response (성공):**
```json
{
  "success": true,
  "message": "API key is valid and working!",
  "model": "claude-3-5-sonnet-20241022",
  "testResponse": "API key is valid"
}
```

**Response (실패):**
```json
{
  "success": false,
  "error": "Invalid API key - Authentication failed",
  "details": {
    "type": "authentication_error",
    "message": "invalid x-api-key"
  }
}
```

### POST /api/upload
단축어 파일을 업로드하고 파싱합니다. (다중 파일 지원)

**Request:**
- `multipart/form-data`
- `files`: 단축어 파일들 (최대 10개)
- 지원 형식: `.atext`, `.plist`, `.json`, `.csv`, `.txt`

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
  "count": 8,
  "totalParsed": 8,
  "filesProcessed": [
    {
      "filename": "shortcuts.json",
      "success": true,
      "count": 3
    },
    {
      "filename": "shortcuts.csv",
      "success": true,
      "count": 5
    }
  ]
}
```

### POST /api/generate
Claude API를 사용하여 예문을 생성합니다. 단일 또는 다중 단축어 지원.

**Request (단일):**
```json
{
  "fullExpression": "by the way",
  "count": 3,
  "claudeApiKey": "sk-ant-api03-..."
}
```

**Request (다중):**
```json
{
  "fullExpressions": ["by the way", "as soon as possible"],
  "count": 5,
  "claudeApiKey": "sk-ant-api03-..."
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "fullExpression": "by the way",
      "examples": "1. By the way, did you finish...\n2. ...",
      "success": true
    },
    {
      "fullExpression": "as soon as possible",
      "examples": "1. Please reply as soon as possible...\n2. ...",
      "success": true
    }
  ],
  "count": 5,
  "totalProcessed": 2
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
├── test-files/        # 테스트용 샘플 파일
│   ├── shortcuts.json
│   ├── shortcuts.csv
│   └── shortcuts.txt
├── uploads/           # 업로드된 파일 임시 저장 (자동 생성)
└── README.md          # 프로젝트 문서
```

## 기술 스택

- **Backend**: Node.js, Express
- **Frontend**: HTML, CSS, JavaScript
- **APIs**: Claude API (Anthropic)
- **Libraries**: 
  - multer: 파일 업로드 (다중 파일 지원)
  - plist: aText/plist 파일 파싱
  - axios: HTTP 클라이언트
  - nodemailer: 이메일 전송

## 주요 특징

### 다중 파일 업로드
- 한 번에 최대 10개의 파일 업로드 가능
- 다양한 형식을 혼합하여 업로드 가능
- 자동으로 중복 단축어 제거

### 유연한 파일 형식 지원
- **Binary aText**: 최신 aText 앱의 바이너리 형식 (제어 문자 포함)
- **XML 형식**: aText/plist 표준 형식 (레거시)
- **JSON 형식**: 다양한 JSON 구조 지원
- **CSV 형식**: 콤마로 구분된 텍스트
- **텍스트 형식**: 탭으로 구분된 텍스트

### 지능형 파싱
- 바이너리 레벨 파싱으로 임베드된 데이터 추출
- 파일 확장자와 내용을 기반으로 자동 형식 감지
- 여러 형식을 순차적으로 시도하는 폴백 메커니즘
- 각 파일의 처리 결과를 개별적으로 표시
- null 바이트 및 제어 문자 처리

## 주의사항

- Claude API Key는 안전하게 보관하세요.
- 현재 이메일 전송 기능은 시뮬레이션 모드입니다. 실제 이메일 전송을 위해서는 `server.js`의 `sendEmail` 함수에서 SMTP 설정을 추가해야 합니다.

## 라이센스

MIT
