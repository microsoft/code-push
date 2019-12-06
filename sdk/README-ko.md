# CodePush

[CodePush](https://microsoft.github.io/code-push) 는 Cordova 및 React Native 개발자가 모바일 앱 업데이트를 사용자의 장치에 직접 배포 할 수있게 해주는 클라우드 서비스입니다. 개발자가 (JS, HTML, CSS 및 이미지)에 대한 업데이트를 게시 할 수있는 중앙 저장소로 작동하고 앱에서 업데이트를 쿼리 할 수 ​​있습니다 ([Cordova](https://github.com/Microsoft/cordova-plugin-code-push) 및 [React Native](https://github.com/Microsoft/react-native-code-push) 용 제공된 클라이언트 SDK 사용). 이를 통해 버그를 해결하거나 바이너리를 다시 빌드하고 각 앱 스토어를 통해 다시 배포 할 필요가없는 작은 기능을 추가 할 때 사용자 기반에보다 결정적이고 직접적인 참여 모델을 적용 할 수 있습니다.
이 Repo에는 [관리 CLI](https://github.com/Microsoft/code-push/tree/master/cli) 및 [Node.js 관리 SDK가](https://github.com/Microsoft/code-push/tree/master/sdk) 포함되어있어 Cordova 및 React Native 앱의 요구를 관리하고 자동화 할 수 있습니다. CodePush를 사용하려면 소스에서 프로젝트를 빌드 / 기여하려면 다음 [문서를](https://docs.microsoft.com/en-us/appcenter/distribution/codepush/) 참조하십시오. 그렇지 않으면 다음 단계를 읽으십시오.

## 개발자 설정

* [Node.js](https://nodejs.org/) 설치
* [Git](http://www.git-scm.com/) 설치
* [Gulp](https://gulpjs.com/) 설치 : `npm install -g gulp`
* 저장소 복제 : `git clone https://github.com/Microsoft/code-push.git`

### 건물

* 저장소의 루트에서 `npm install` 을 실행하십시오.
* `gulp install` 을 실행하여 프로젝트 내 각 모듈의 NPM 종속성을 설치하십시오.
* 로컬 개발을 위해 CLI 및 SDK를 연결하는 꿀꺽 꿀꺽 링크를 실행하십시오. SDK를 변경하고 CLI가 변경 사항을 선택하게하려면이 단계를 수행하는 것이 좋습니다.
* 꿀꺽 마심 빌드를 실행하여 모든 모듈을 빌드하십시오. 모듈 중 하나 (예 : cli 또는 sdk) 만 만들려면 `gulp build-cli `또는 `gulp build-sdk` 를 실행하십시오.

### 테스트 실행

모든 테스트를 실행하려면 프로젝트 루트에서 꿀꺽 꿀꺽 테스트 스크립트를 실행하십시오.

프로젝트 (예 : cli 또는 sdk) 중 하나만 테스트하려면 `gulp test-cli` 또는 `gulp test-sdk` 를 실행하십시오.

### 코딩 규칙

* 문자열에 큰 따옴표 사용
* 네 개의 스페이스 탭 사용
* 로컬 변수 및 가져온 모듈에는 camelCase를 사용하고 유형에는 PascalCase를 사용하고 파일 이름에는 대시 - 대소 문자를 사용합니다.
  
이 프로젝트는 [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/) 를 채택했습니다. 자세한 내용은 행동 강령 [FAQ](https://opensource.microsoft.com/codeofconduct/faq/) 를 참조하거나 추가 질문이나 의견이 있으면 [opencode@microsoft.com](mailto:opencode@microsoft.com) 에 문의하십시오.
