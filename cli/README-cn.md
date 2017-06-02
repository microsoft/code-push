# CodePush 命令行

#### Note: This translated document is community contributed and maintained, it will not be kept updated or in sync with the [original](./README.md) by the main contributors. Please send a pull request if you find any issues.
#### 注：本翻译文档是由社区贡献和维护，不受[原文](./README.md)的作者持续维护并更新。如果您发现任何问题，请发送pull请求。

CodePush是一个云服务，它能让Cordova和React Native的开发者将手机应用的更新直接部署到用户的设备上。
它担任类似中间仓库的角色，开发者可以把更新（JS，HTML，CSS和图片）发布到这个仓库上，然后那些Apps就能查询到更新了（那些集成了CodePush SDKs的[Cordova](http://github.com/Microsoft/cordova-plugin-code-push)和[React Native](http://github.com/Microsoft/react-native-code-push) 应用）。

这就让你可以与你的用户群有一个更确定且直接的交互模式，当你定位到Bug或添加小功能时，就不需要重新构建二进制文件再在各AppStore里重新发布了。

![CodePush CLI](https://cloud.githubusercontent.com/assets/116461/14505396/c97bdc78-016d-11e6-89da-3f3557f8b33d.png)

* [安装](#安装)
* [快速开始](#快速开始)
* [创建账号](#创建账号)
* [身份认证](#身份认证)
* [应用管理](#应用管理)
* [应用合作](#应用合作)
* [部署管理](#部署管理)
* [发布更新](#发布更新)
    * [发布更新 (General)](#发布更新-general)
    * [发布更新 (React Native)](#发布更新-react-native)
    * [发布更新 (Cordova)](#发布更新-cordova)
* [补丁更新](#补丁更新)
* [促进更新](#促进更新)
* [回滚更新](#回滚更新)
* [查看发布历史](#查看发布历史)
* [清除发布历史](#清除发布历史)

[[English Version]](./README.md)

## 安装

* 安装 [Node.js](https://nodejs.org/)
* 安装 CodePush CLI: `npm install -g code-push-cli`

## 快速开始

1. 使用CodePush CLI创建一个[CodePush 账号](#创建账号)
2. 注册你的CodePush[应用](#应用管理), 并[分享](#应用合作)给你团队的其它开发者 
3. 用[Cordova插件](http://github.com/Microsoft/cordova-plugin-code-push) 或 [React Native插件](http://github.com/Microsoft/react-native-code-push)配置好CodePush并指向你希望的部署环境
4. [发布](#发布更新)更新
5. 活的长而成功！[详细资料](https://en.wikipedia.org/wiki/Vulcan_salute)

## 创建账号

在你发布应用更新之前，你需要创建一个CodePush帐号。一旦你安装了Cli你就可以简单的使用如下命令来注册：

```
code-push register
```

这将会启动浏览器，要求验证你的Github或微软帐号。一旦验证成功，它将创建一个CodePush帐号跟你的Github或MSA相连，并生成一个访问密钥(Access Key)，你可以拷贝/粘贴到CLI以便登录。

*注意：注册成功后，你就已经自动登录了。所以除非你明确登出了，否则你不需要在此机器上再次登录。*

如果你已有一个帐号，那你还可以把你的帐号跟另一个身份认证提供商关联起来，通过运行：

（我个人理解：CodePush提供商有Github和Mircosoft，它允许你可以把两个帐号关联起来。）

```
code-push link
```

注意：为了实现这个(关联)的目的，你在另一个身份认证供应商那边用的Email地址必须与你现存的帐号一致。

## 身份认证

在CodePush CLI里大多数命令需要身份认证，所以在你开始管理你的帐号之前，你需要使用GitHub或者微软帐号注册和登录。你可以通过执行如下命令做到这些：

```
code-push login
```

这将会启动浏览器，要求验证你的Github或微软帐号。这将生成一个访问密钥(Access Key)，然后你可以拷贝/粘贴到CLI（它会提示你这样做）。这时你就认证成功了，并且可以关掉你的浏览器了。


如果在任何时候你想确认你是否已经登录了，你可以运行如下命令来显示与你当前认证会话相关的e-mail帐号，而且这个身份提供者是连接到（如：GitHub）的。

```shell
code-push whoami
```

当你从CLI登录后，你的访问密钥(Access Key)就一直保存在你本地磁盘上，所以你不必每次使用帐号是都需要登录。为了终止会话或删除AccessKey，你可以简单的运行如下命令：

```
code-push logout
```

如果你在一台机器上忘记注销（比如：你朋友的电脑上），你可以使用如下命令列出和删除任何“激活中”的Access Keys。Access Keys列表将显示创建Key的机器名和发生登录的时间。这让你可以简单的认出那些你不想要保存的Keys。

```
code-push access-key ls
code-push access-key rm <accessKey>
```

如果你需要额外的Keys，被用来验证CodePush服务而不需要给你的GitHub和/或访问微软凭证，您可以运行下面的命令来创建一个持久的Access Key(连同一个描述):

```
code-push access-key add "VSTS Integration"
```
在创建新的密钥之后，您可以在`login`命令后使用`--accessKey`标志并指定其值，它允许您执行“无头”身份验证，而不是启动一个浏览器。

```
code-push login --accessKey <accessKey>
```
当使用这种方式登录时，密钥(Access Key)在注销时不会自动失效，它可以一直被使用，除非它从CodePush服务端明确被移除掉。然而，仍然建议一旦你完成了会话就注销掉，以便从本地磁盘移除掉你的授权证书。

## 应用管理

在你发布更新前，你需要用如下命令在CodePush服务上注册一个App：

```
code-push app add <appName> <os> <platform>
```

如果你的App既有IOS又有Android，我们推荐你创建单独的App。一个平台一个。这样你可以单独的管理和发布更新，从长远来看这会让事情更简单。大部分人的命名约定会在App名加后缀`-IOS`和`-Android`。例如：

```
code-push app add MyApp-Android
code-push app add MyApp-iOS
```

所有新的Apps自动会出现有个部署环境（`Staging`和`Production`），为了你可以开始发布更新到不同的渠道而不需要做任何其它的事（参考下面的部署指南）。你创建一个App之后，CLI将显示`Staging`和`Production`环境的开发密钥，你就可以使用不同的SDKs(详细请看[Cordova](http://github.com/Microsoft/cordova-plugin-code-push) 和 [React Native](http://github.com/Microsoft/react-native-code-push))来配置你的手机端App了。

如果你不喜欢你之前取的名字，你还可以随时重命名它，使用如下命令：

```
code-push app rename <appName> <newAppName>
```

应用的名字从管理方面看只是为了能辨识，因此，必要时可以随时重命名它。它其实不会影响正在运行的应用程序，因为更新的查询都是通过部署密钥的。

如果你不想要一个App，你可以从服务端上移除它，命令如下：

```
code-push app rm <appName>
```

做这个移除请务必小心，因为任何配置了它的App都将停止收到更新了。

最后，如果你想列出你在CodePush服务上注册的所有Apps，你可以运行如下命令：

```
code-push app ls
```

## 应用合作

如果你讲和其它开发者在一起合作同一个CodePush应用，你可以把他们添加为合作者，使用如下命令：

```shell
code-push collaborator add <appName> <collaboratorEmail>
```

*注意： 这个期待开发者已经用e-mail[注册](#创建账号)了CodePush，所以在打算分享应用之前确保他们已经准备好了一切。*

一旦添加了，所有的合作者将立即拥有了最新分享App的如下权限：

1. 查看App，它的合作者，[部署管理](#部署管理)和[查看发布历史](#查看发布历史)。
1. [发布](#发布更新)更新到任何应用的部署环境。
1. [促进](#促进更新)更新在任何应用部署环境之间。
1. [回滚](#回滚更新)任何应用部署。
1. [打补丁](#补丁更新)在任何应用部署里。

相反的，这就意味着一个合作者不能做任何如下的事情：

1. 重命名或删除应用。
1. 转让应用的所有权。
1. 创建，重命名或删除新的部署环境。
1. 清除一个部署历史。
1. 添加或删除合作者。

*注意：一个合作的开发者可以移除他/她自己。*

随着时间的推移，如果有人不再和你一起合作，那你可以解除合作者关系，使用如下命令：

```shell
code-push collaborator rm <appName> <collaboratorEmail>
```

如果你想列出应用的所有合作者，你可以简单的运行如下命令：

```shell
code-push collaborator ls <appName>
```

最后，如果在某刻你（作为App的拥有者）将不再开发App了，你想转让给其他开发者（或客户），你可以运行如下命令：

```shell
code-push app transfer <appName> <newOwnerEmail>
```

*注意：就像`code-push collaborator add`命令一样，这期望新的拥有者已经用指定的e-mail注册了CodePush。*

一经确认，该指定的开发者成为App的拥有者，而且立即接收到该角色的相关权限。除了拥有权转移外，其它的任何都没有被修改（比如：部署环境，发布历史，合作者）。这意味着你还仍然是该App的一个合作者，所以如果你想移除你自己，那你可以在成功转让拥有全后简单的运行`code-push collaborator rm`命令。 

## 部署管理

从CodePush的角度来看，一个应用把一个或更多的东西简单命名分组称为“部署(环境)”。

While the app represents a conceptual "namespace" or "scope" for a platform-specific version of an app (e.g. the iOS port of Foo app), its deployments represent the actual target for releasing updates (for developers) and synchronizing updates (for end-users). Deployments allow you to have multiple "environments" for each app in-flight at any given time, and help model the reality that apps typically move from a dev's personal environment to a testing/QA/staging environment, before finally making their way into production.

*注意: 正如你将在下面看到的`release`（发布），`promote`（提升），`rollback`（回滚）命令需要应用名字和部署名字，因为这两个组成一个独特的发布标识（例如：我想发布更新到我的IOS应用给beta环境的测试者们）。*

当一个用CodePush服务注册的应用，它默认包含两个部署环境：`Staging`和`Production`。这让你可以理解发布更新到一个内部的环境，你可以在推送到终端用户之前彻底的测试每个更新。这个工作流是至关重要的，以确保你的版本准备好给大众，而且这是一个在Web上实践很久的惯例。

如果你的App有`Staging`和`Production`环境其实已经满足了你的需求，然后你不需要做任何事情。不过，如果你需要alpha，dev等部署环境，那你可以简单的使用如下命令创建：

```
code-push deployment add <appName> <deploymentName>
```

就像Apps一样，你也可以删除或重命名部署环境，分别使用如下命令：

```
code-push deployment rm <appName> <deploymentName>
code-push deployment rename <appName> <deploymentName> <newDeploymentName>
```

你可以在任何时候查看特定应用包含的部署环境列表，你可以简单的运行下面的命令：

```
code-push deployment ls <appName> [--displayKeys|-k]
```

这将不仅显示部署环境列表，而且还有元数据（例如：强制性属性，描述）和最新版本的安装指标：

![Deployment list](https://cloud.githubusercontent.com/assets/116461/12526883/7730991c-c127-11e5-9196-98e9ceec758f.png)

*注意: 因为他们很少用和需要屏幕，部署密钥默认是不显示的。如果你需要查看它们，只要在`deployment ls`命令后面加上`-k`标识即可。*

安装指标有如下意义：

* **Active（激活）** - 成功安装的数量目前运行这个版本。这个数字将会随着用户更新到或离开这个版本分别增加或减少。

* **Total** - 该版本更新收到的所有成功安装的总数。这个数字只会随新用户/设备安装它而增加，所以它是__激活__的超集。

* **Pending** - 更新被下载了但还没安装的数量。This would only apply to updates that aren't installed immediately, and helps provide the broader picture of release adoption for apps that rely on app resume and restart to apply an update.

* **Rollbacks** - 该版本被自动回滚的次数。理想情况下这个数应该为0，而且在这种情况下这个量是不会显示的。然而，如果你发布了一个包含严重问题(Crash)的更新，CodePush插件将在安装时回滚到上一个版本，同时把问题反馈到服务端。这可以让终端用户依旧能用，不被损坏的版本阻塞住，而且能够在CLI里看到这些，你可以鉴定错误的版本并且能在服务器上做出[回滚](#回滚更新)的响应。

* **Rollout** - 显示有资格接收更新的百分比。这个属性只会被显示在那些`激活的`的首次展示的版本，所以，首次展示百分比是小于100%。此外， 因为一个部署任何时候只能有一个激活的首次展示，这个标签只会被显示在最新的一次部署里。

* **Disabled** - 标示是否该版本被标记成失效的，因此用户是否可下载。这个属性只有在版本真实失效时才显示。

当度量(metrics)单元格统计为`No installs recorded`（无安装记录），那是表示这个版本在服务器上没有任何活动记录。这可能要么是因为被插件阻止了，或者用户还没有跟CodePush服务器同步。一旦发生了安装，你将在CLI里看到该版本的度量。

## 发布更新

一旦你的App被配置了从CodePush服务器查询版本更新，你就可以向它开始发布。为了简易性和灵活性，CodePush CLI包含三种不同的发布命令：

1. [通用](#发布更新-general) - 使用外部的工具或构建脚本（如：Gulp任务，`react-native bundle`命令）像CodePush服务器发布一个更新。这对装配进目前的工作流而言提供最灵活的方式，因为它严格按CodePush特性的步骤处理，而把App特性的编译过程留给你。

2. [React Native](#发布更新-react-native) - 跟通用发布命令一样执行相同的功能，但是还会为你生成的应用更新内容(JS包和资源)，而不需要你运行`react-native bundle`，然后执行`code-push release`。

3. [Cordova](#发布更新-cordova) - 跟通用发布命令一样执行相同的功能，但也会为你处理准备应用更新的任务，而不需要你运行`cordova prepare`，然后执行`code-push release`。

你应该使用哪个命令主要是一种需求或偏好的事。然而，我们通常推荐使用相关的特定平台的命令开始(因为它大大简化了体验)，然后当有更大控制必要时用通用的`release`命令。

### 发布更新 (General)

```
code-push release <appName> <updateContents> <targetBinaryVersion>
[--deploymentName <deploymentName>]
[--description <description>]
[--disabled <disabled>]
[--mandatory]
[--rollout <rolloutPercentage>]
```

#### App name (应用名)参数

指定将发布更新的CodePush 应用名。这个与最初你调用`code-push app add`（如："MyApp-Android"）的名字保持一致。如果你想查一下，可以运行`code-push app ls`命令看看应用的列表。

#### Update contents (更新内容)参数

指定应用更新的代码和资源位置。你可以提供要么一个单独文件（如：React Native的JS bundle文件），或者一个文件夹路径（如：Cordova应用的`/platforms/ios/www`文件夹）。注意你不需要为了部署更新而对文件或文件夹进行Zip压缩，因为CLI会帮你自动ZIP压缩。

重要的是你指定的路径是跟特定平台相关的，准备/打包你的应用。下面表格概括了在发布前你应该运行哪个命令，以及你以后可以参考的`updateContents` 参数路径:

| 平台                         | 准备命令（Prepare command ） | 包的路径 (相对项目的根目录) |
|-------------------------------------|--------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| Cordova (Android)             | `cordova prepare android`                    | `./platforms/android/assets/www` 目录                                                                 |
| Cordova (iOS)                    | `cordova prepare ios`                                  | `./platforms/ios/www ` 目录                                                                      |
| React Native wo/assets (Android) | `react-native bundle --platform android --entry-file <entryFile> --bundle-output <bundleOutput> --dev false`                                               |  `--bundle-output` 参数的值                                                                      |
| React Native w/assets (Android)  | `react-native bundle --platform android --entry-file <entryFile> --bundle-output <releaseFolder>/<bundleOutput> --assets-dest <releaseFolder> --dev false` |  `--assets-dest` 参数的值，应该是一个包含资源和JS bundle的新创建的目录。|
| React Native wo/assets (iOS)    | `react-native bundle --platform ios --entry-file <entryFile> --bundle-output <bundleOutput> --dev false`   | `--bundle-output` 参数的值  |
| React Native w/assets (iOS)      | `react-native bundle --platform ios --entry-file <entryFile> --bundle-output <releaseFolder>/<bundleOutput> --assets-dest <releaseFolder> --dev false` | `--assets-dest` 参数的值，应该是一个包含资源和JS bundle的新创建的目录。|

#### Target binary version (目标二进制版本)参数

这是你想发布更新的特定仓库/二进制版本，这样只有那个版本上的用户才会接收到更新，而那些运行较老/新版本用户则不会。这样很有用，原因如下：

1. 如果有用户运行一个很老的版本，有可能在CodePush的更新里有个破坏性的更新，这跟他们现在运行的版本不兼容。

2. 如果用户正在运行一个新的二进制版本，那么假定，他们正在运行并更新CodePush 更新（可能不兼容）。

如果你想更新应用商店里二进制文件的多个版本，我们允许你指定参数像这样[语义版本范围表达式](https://github.com/npm/node-semver#advanced-range-syntax)。这样， 任何在版本号范围内（如：`semver.satisfies(version, range)` returns `true`）的客户端设备都能获得更新。

如下是有效的版本号范围表达式的例子：

| 范围表达式 | 谁获得更新                                                                                         |
|------------------|----------------------------------------------------------------------------------------|
| `1.2.3`          | 只有`1.2.3`版本                                                                                |
| `*`                 | 所有版本                                                                                        |
| `1.2.x`          | 主版本为1，小版本为2的任何版本                                       |
| `1.2.3 - 1.2.7`  | 在 `1.2.3` (包含) 和 `1.2.7` (包含) 之间的版本                 |
| `>=1.2.3 <1.2.7` | 在 `1.2.3` (包含) 和 `1.2.7` (不包含)之间的版本          |
| `~1.2.3`         | 相当于`>=1.2.3 <1.3.0`                                                         |
| `^1.2.3`         | 相当于`>=1.2.3 <2.0.0`                                                         |

*注意：如果语义表达式以特殊字符开始如`>`,`^`或***，如果你没有用引号括起来的话命令可能执行不对，因为shell在CLI里不支持右边的值。所以，当调用`release`命令时最好能把你的`targetBinaryVersion`参数用双引号括起来，如：`code-push release MyApp updateContents ">1.2.3"`。*

如下表格分别概括了每个应用类型的CodePush更新的语义版本范围的版本值：

| 平台               | 应用商店版本来源 |
|------------------------|------------------------------------------------------------------------------|
| Cordova                | 在`config.xml`文件里的`<widget version>` 属性   |
| React Native (Android) | 在`build.gradle`文件里 `android.defaultConfig.versionName` 属性 |
| React Native (iOS)     | 在`Info.plist`文件里的`CFBundleShortVersionString` 键          |
| React Native (Windows) | 在`Package.appxmanifest`文件的 `<Identity Version>` 键     |

*注意：如果在元数据文件里的应用版本号漏掉补丁版本值，如`2.0`，它将被当成补丁版本值为`0`，如：`2.0 当成 2.0.0`.*

#### Deployment name (部署环境名)参数

这是你想发布更新到的那个指定部署环境名。默认为`Staging`(临时环境)，但是当你准备部署到`Production`(生产环境)或一个你自定义的部署环境时，你只要指明设置这个参数即可。

*注意：这个参数可以用"--deploymentName" 或 "-d"来设置。*

#### Description (描述)参数

给部署提供一个可选的"更新日志"。当被检测到有更新时这个值就会完整的传到客户端，所以你的应用可以选择显示给终端用户（如：通过一个`哪些新东西？`的对话框）。这个字符串可以接受控制字符如`\n` 和 `\t`，以便你可以包含空白格式在你的描述里来提高可读性。

*注意：这个参数可以用"--description" 或 "-des"来设置。*

#### Mandatory (强制性)参数

这个标识该更新是否是强制性的（如：包含一个严重的安全修复）。这个属性简单的传到客户端，然后客户端决定是否要强制更新。

*注意: 这个参数是简单的一个"标记"，所以，没有该标记表示版本更新可选，如果有标记则表示版本是强制更新的。你可以给它赋值（如：`--mandatory true`)，但其实简单的`--mandatory`就已能标识强制更新了。*

强制属性是唯一的，因为服务端必要时将动态修改它，为了确保你对终端用户的版本更新语义上的维护。例如：设想你的应用有如下3个更新：

| 版本 | 强制？ |
|---------|------------|
| v1      | No         |
| v2      | Yes       |
| v3      | No         |

如果用户当前是`v1`版本，然后从服务端查询更新，将以`v3`（因为这是最新的）响应，但是它将动态将这个版本转变成强制的，因为中间有一个强制更新的版本。这个行为很重要因为`v3`的代码是在`v2`上增加的，所以任何没有获取`v2`版本的都会不管`v2`的强制，而继续让`v3`变成强制更新版本。

如果用户当前是`v2`版本，然后从服务器查询更新，响应结果为`v3`，但会留着这个版本作为可选的。这个因为他们已经接受了强制更新，所以没有必要去修改`v3`。这样的行为就是为什么我们说服务器会"动态改变"强制标签，因为随着版本的迭代，新版本的强制属性总会保存你设置的这个值。当有一个版本更新检查要响应给用户时，它只会在相邻的版本上改变。

如果你从没发布一个强制的更新，那么上面的行为不会应用到你，因为服务器从不改变一个可选的版本为强制版本，除非有像上面阐述的那样掺杂了强制版本。此外，如果一个版本标记成强制了，它决不会被转变成可选的，因为那没有任何意义。为了尊重上面描述的语义，服务器将只会把一个可选的发布改变为强制的。

*注意：这个参数可以用`--mandatory` 或 `-m`来设置*

#### Rollout 参数

**重要：为了使这个参数有效，终端用户需要运行CodePush插件的`1.6.0-beta+`版本 (Cordova) 或 `1.9.0-beta+`版本 (React Native)。如果你发布了一个指明了首次展示(Rollout)属性的更新，那么运行老版本的Cordova或ReactNative用户不会更新。因此，直到你已经采取了必要CodePush SDK的版本，否则我们不建议设置一个首次展示(rollout)版本，因为没有人会接受它。**

这指定了可以接收这次更新的用户百分比（在`1`到`100`之间的数字）。这会是有帮助的，假如你想在每个人广泛获取之前，"飞行"一个新版本给部分的受众（如：25%） ，并且得到异常/崩溃的反馈观察。如果没有设置这个参数，它会设置为`100%`，所以，你只需要在你想实际限制多少用户能接收时去设置它。

当借用首次展现(rollout)能力，要记住一些额外注意事项：

1. 你不可以在最新版本的首次展示是"有效的"（如：首次展示值非空）的部署环境上发布新更新。在你在部署环境上发布进一步更新之前，首次展示属性需要是"完全的"（如：设置`roullout`属性为`100`）。

2. 如果你回滚部署环境，它的最新版本的首次展示是"有效的"，那首次展示的值将被清除，实际上"禁止"首次展示行为。

3. 不像`mandatory`和`description`字段，当从一个部署环境中促进发布时，它将不会传送`rollout`属性，所以，如果你想新的发布（在目标部署环境里）有首次展示的值，那么你需要在调用`promote`命令时明确的设置它。

*注意：这个参数可以用 `--rollout` or `-r` 来设置*

#### Disabled 参数

这个指明一个版本更新是否可以被用户下载。如果没有指定，版本更新不会是无效的（如：用户将要下载的那一刻你的应用称为`同步`）。如果你想发布一个更新但不是立即生效，那么这个参数是有价值的，直到你明确用[补丁](#补丁更新)发布，当你要让用户能够下载（如：公告博客上线）。

*注意：这个参数可以用 "--disabled" or "-x"来设置*

### 发布更新 (React Native)

```shell
code-push release-react <appName> <platform>
[--bundleName <bundleName>]
[--deploymentName <deploymentName>]
[--description <description>]
[--development <development>]
[--disabled <disabled>]
[--entryFile <entryFile>]
[--mandatory]
[--sourcemapOutput <sourcemapOutput>]
[--targetBinaryVersion <targetBinaryVersion>]
[--rollout <rolloutPercentage>]
```
`release-react`命令是React Native特有的[`发布`](#发布更新)命令，支持相同的所有参数（如：`--mandatory`,`--description`），然而通过如下额外的动作简化了发布更新过程：
 
1. 运行`react-native bundle`命令去生成将要发布到CodePush服务的[更新](#update-contents-params)(JS Bundle和资源)。它尽可能使用合理的默认值(如：创建一个non-dev构建,假设一个iOS入口文件被命名为“index.ios.js”)，但也暴露了有关`react-native bundle`参数使得灵活（如：`--sourcemapOutput`）。

2. 通过使用定义在项目文件`info.plist`(IOS)和`build.gradle`(Android)里的版本名，推断[`targetBinaryVersion`](#target-binary-version-目标二进制版本-参数)的值。

为了阐述`release-react`命令产生的差异，如下的例子是你可能如何生成和发布一个React Native应用版本更新，通过使用`release`命令：

```shell
mkdir ./CodePush

react-native bundle --platform ios \
--entry-file index.ios.js \
--bundle-output ./CodePush/main.jsbundle \
--assets-dest ./CodePush \
--dev false

code-push release MyApp ./CodePush 1.0.0
```

用`release-react`命令实现等效的行为只需简单的如下的命令，这个通常更,这是通常更少出错：

```shell
code-push release-react MyApp ios
```

*注意：我们相信`release-react`命令对大多数React Native的开发者是有价值的，所以如果你发现它不够灵活或者缺少关键功能，不要犹豫请[让我们知道](mailto:codepushfeed@microsoft.com)，以便我们可以提高它。*

#### App name 参数

这个参数跟[上面章节](#App-name-应用名-参数)描述的一样。

#### Platform 参数

指定当前的更新是哪个平台的，可以是`android`， `ios`， 或`windows`（不区分大小写）。

#### Deployment name 参数

相同的参数跟 [上面的章节](#deployment-name-参数)描述一样。

#### Description 参数

相同的参数跟 [上面的章节](#description-参数)描述一样。

#### Mandatory 参数

相同的参数跟 [上面的章节](#mandatory-参数)描述一样。

#### Rollout 参数

相同的参数跟 [上面的章节](#rollout-参数)描述一样。如果没有指定，版本将对所有用户有效可下载。

#### Target binary version 参数

相同的参数跟 [上面的章节](#target-binary-version-参数)描述一样。如果没有指定，默认使用`Info.plist` (iOS) and `build.gradle` (Android)文件里指定的精确版本号。

#### Disabled 参数

相同的参数跟 [上面的章节](#disabled-参数))描述一样。

#### Development 参数

这个指明是否要生成一个非最小化，开发的JS bundle文件。如果没有指明，默认是`false`，禁用警告提示并且bundle文件是最小化的。

*注意：这个参数可以配置成`--development` 或`--dev`*

#### Entry file 参数

指明相对应用根目录的路径入口JavaScript 文件。如果没有指定，默认是：如果存在`index.ios.js`(IOS), `index.android.js`(Android), 或者`index.windows.bundle`(Windows)，否则`index.js`。

*注意：参数可以配置成`--entryFile`或`-e`*

#### Bundle name 参数

指明生成JS Bundle的文件名。如果没有指定，特定平台将会用的标准bundle名字：`main.jsbundle` (iOS), `index.android.bundle` (Android) and `index.windows.bundle` (Windows).

*注意：参数可以配置成`--bundleName`或`-b`*

#### Sourcemap output 参数

指明生成的JS bundle 的sourcemap写入的相对路径。如果没有指定，sourcemaps文件不会生成。

*注意：参数可以配置成`--sourcemapOutput`或`-s`*

### 发布更新 (Cordova)

```shell
code-push release-cordova <appName> <platform>
[--deploymentName <deploymentName>]
[--description <description>]
[--mandatory]
[--targetBinaryVersion <targetBinaryVersion>]
[--rollout <rolloutPercentage>]
[--build]
```

这个`release-cordova` 命令是Cordova特有的[`发布`](#发布更新)命令，支持相同的所有参数（如：`--mandatory`，`--description`），然而通过如下额外的动作简化了发布更新过程：

1. 运行`cordova prepare`命令去生成将要发布到CodePush服务的[更新内容](#update-contents-更新内容-参数) (`www` 文件夹) 。

2. 通过使用定义在项目文件`config.xml`文件里的版本名，推断[`targetBinaryVersion`](#target-binary-version-目标二进制版本-参数) 的值。

为了阐述`release-cordova`命令产生的差异，如下的例子是你可能如何生成和发布一个Cordova应用版本更新，通过使用`release`命令：


```shell
cordova prepare ios
code-push release MyApp ./platforms/ios/www 1.0.0
```

用`release-cordova`命令实现等效的行为只需简单的如下的命令，这个通常更,这是通常更少出错：

```shell
code-push release-cordova MyApp ios
```

注意：我们相信`release-cordova`命令对大多数Cordova的开发者是有价值的，所以如果你发现它不够灵活或者缺少关键功能，不要犹豫请[让我们知道](mailto:codepushfeed@microsoft.com)，以便我们可以提高它。

#### App name 参数

这个参数跟[上面章节](#App-name-应用名-参数)描述的一样。

#### Platform 参数

指定当前的更新是哪个平台的，可以是`ios`或`android`（不区分大小写）。

#### Deployment name 参数

相同的参数跟 [上面的章节](#deployment-name-参数)描述一样。

#### Description 参数

相同的参数跟 [上面的章节](#description-参数)描述一样。

#### Mandatory 参数

相同的参数跟 [上面的章节](#mandatory-参数)描述一样。

#### Rollout 参数

相同的参数跟 [上面的章节](#rollout-参数)描述一样。如果没有指定，版本将对所有用户有效可下载。

#### Target binary version 参数

相同的参数跟 [上面的章节](#target-binary-version-参数)描述一样。如果没有指定，默认使用项目元数据里指定的（`Info.plist` (iOS) and `build.gradle` (Android)版本号。

#### Disabled 参数

相同的参数跟 [上面的章节](#disabled-参数))描述一样。

#### Build 参数

当你生成版本更新的web资源时，指定是否想用`cordova build`来取代`cordova prepare`（默认行为）。这是有价值的，假设你的项目包含构建钩子（如：转换TypeScript），所以CodePush简单的运行`cordova prepare`不够充分的创建和发布更新。如果没有指定，它默认是`false`。

*注意：这个参数可以用`--build`或`-b`来设置*

## 补丁更新

在发布更新之后，可能有这样的场景，你需要修改一个或多个相关的属性（如：你忘记给一个严重的Bug修复打上强制标记了，你想增加更新的首次展示百分比）。你可以很容易的用下面的命令行来实现：

```shell
code-push patch <appName> <deploymentName>
[--label <releaseLabel>]
[--mandatory <isMandatory>]
[--description <description>]
[--rollout <rolloutPercentage>]
[--disabled <isDisabled>]
[--targetBinaryVersion <targetBinaryVersion>]
```

抛开`appName` 和 `deploymentName`，所有参数是可选的，所以，你可以用这个命令一次性更新单个或者所有属性。调用`patch`命令而不指定任何属性将不产生任何操作结果。

```shell
# Mark the latest production release as mandatory
code-push patch MyApp Production -m

# Increase the rollout for v23 to 50%
code-push patch MyApp Production -l v23 -rollout 50%
```

### Label 参数

表明你想在指定的部署环境里更新哪个发布版本（如：`v23`）。如果省略了，那要求的变化将应用到指定的部署环境的最新版本上。为了查看你想更新的版本标签，你可以运行`code-push deployment history`命令并参见`Label`列。

*注意：这个参数可以设置成`--label`或`-l`*

### Mandatory 参数

同样的参数跟[上面的章节](#mandatory-参数)描述一致，简单的允许你更改这个版本是否考虑强制更新。注意`--mandatory`和`--mandatory true`是同等的，但是缺少这个标记不等于`--mandatory false`。所以，如果参数省略了，对目标版本的强制性属性来说不会产生任何改变。你需要设置`--mandatory false`去明确的标识版本是可选的。

### Description 参数

同样的参数跟[上面的章节](#description-参数)描述一致，简单的允许你更改关联版本的描述（如：你在发布时写了个错别字，或者你完全忘记添加一个描述了）。如果参数省略掉了，那么对于目标版本的描述属性来说不会有任何改动。

### Disabled 参数

同样的参数跟[上面的章节](#disabled-参数)描述一致，简单的允许你去更改发布的版本是否无效。注意`--disabled`和`--disabled true`是等同的，但是缺省这个标识不等于`--disabled false`。所以，如果忽略了该参数，并不会对目标版本的无效(disabled)属性有修改。你需要设置`--disabled false`去明确标识一个以前无效的版本有效。

### Rollout 参数

同样的参数跟[上面的章节](#rollout-参数)描述一致，简单的允许你去__增加__目标版本首次展示的百分比。这个参数只能设成一个比当前首次展示值要大的数字。此外，如果你想"完全的"首次展示，因此，让版本对每个人有效，你可以简单的设置参数`--rollout 100`，如果省略了这个参数，目标版本的首次展示(rollout)属性不会有任何改动。

此外，上面提到的，当你发布版本时没有指定首次展示(rollout)的值时，它相当于是被设置成了`100`。因此，如果你发布一个没有首次展示的更新，那你不可以通过`patch`命令改变rollout属性，因为那样是被认为在降低首次展示(rolltout)百分比。

### Target binary version 参数

同样的参数跟[上面的章节](#target-binary-version-参数)描述一致，简单的允许你去更改语义版本范围表明兼容哪个版本版本。这个可以很有用，如果你在最初发布时犯了个错（如：你指定`1.0.0`但本意`1.1.0`）或你想增加或减少版本支持的版本范围（如：你发现一个版本总是不能在`1.1.2`版本上正常运行）。如果省略了这个参数，目标版本的版本号属性不会有任何改动。

```shell
# 给意境存在的版本添加一个"最大二进制版本"范围
#  by scoping its eligibility to users running >= 1.0.5
code-push patch MyApp Staging -t "1.0.0 - 1.0.5"
```

## 促进更新

一旦测试完指定部署环境的版本更新（如：`Staging`），你想把它向下游推进（如：dev->staging, staging->production)，你可以简单的用如下命令去从一个部署环境拷贝到另一个：

```
code-push promote <appName> <sourceDeploymentName> <destDeploymentName>
[--description <description>]
[--disabled <disabled>]
[--mandatory]
[--rollout <rolloutPercentage>]
[--targetBinaryVersion <targetBinaryVersion]
```

这个`promote`命令将在部署环境里创建一个新的版本，包含**准确的代码和元数据**（描述，强制和目标版本号）来自源部署环境的最新版本。然而你可以用`release`命令去"手动"从一个环境移植更新到另一个环境，`promote`命令有如下优势：

1. 它更快些，因为你不需要重新装配版本资源，那些你想发布或记住源部署环境的版本的描述/应用版本。

2. 它更少出错，因为提升的操作确保你在源部署环境（如：`Staging`）已经测试过的那些确定的东西将在目标部署环境（如：`Production`）变成有效的。

我们推荐所有的用户利用自动创建的`Staging`和`Production`环境的优势，把所有的版本发布到`Staging`，然后经过适当的测试后从`Staging`执行`promote`到`Production`。

### Description 参数

相同的参数在[上面的章节](#description-参数)描述过，简单的允许你覆写将使用的提升版本的描述。如果没有指定，新的版本将继承被提升的版本描述。

#### Disabled 参数

相同的参数在参数[上面的章节](#disabled-参数)描述过，简单的允许你去覆写将使用的提升版本的失效标记的值。如果没有指定，新版本将继承被提升版本的失效(disabled)属性。

### Mandatory 参数

相同的参数在参数[上面的章节](#mandatory-参数)描述过，简单的允许你覆写将使用的提升版本的强制标记。如果没有指定，新版本将继承被提升版本的强制属性的值。

### Rollout 参数

相同的参数在参数[上面的章节](#rollout-参数)描述过， 允许你指定新创建的版本是否只对部分用户有效。不像其它的元数据参数（如：`description`），版本的`rollout`属性不会做为提升的一部分而携带过来，所以，如果你不想新的版本对所有用户有效的话，你需要明确去设置它。

### Target binary version 参数

相同的参数在[上面的章节](#target-binary-version-参数)描述过，简单的允许你覆写使用的提升版本的版本号(target binary version)。如果没有指定，新的版本将继承被提升版本的版本号。

```shell
# Promote the release to production and make it 
# available to all versions using that deployment
code-push promote MyApp Staging Production -t "*"
```

## 回滚更新

一个部署环境的发布历史是不可以改变的，所以一旦被发布你不能删除或移除更新。然而，如果你发布了一个坏的更新或包含计划外的功能，使用`rollback`命令很容易把它回滚：

```
code-push rollback <appName> <deploymentName>
code-push rollback MyApp Production
```

这个的影响是在部署环境里创建一个包含**精确的代码和资源**的新版本，比最新版本更优先的一个版本。举个例子，想象你发布了如下更新：

| 版本 | 描述       | 强制 |
|---------|-------------------|-----------|
| v1      | 初始化版本!  | Yes       |
| v2      | 添加新功能   | No        |
| v3      | 修复Bugs      | Yes       |

如果你在部署环境里运行`rollback`命令，一个包含`v2`版本内容的新的版本(`v4`)将会被创建。

| 版本 | 描述       | 强制 |
|---------|-------------------|-----------|
| v1      | 初始化版本!  | Yes       |
| v2      | 添加新功能   | No        |
| v3      | 修复Bugs      | Yes       |
| v4 (从v3回滚到v2) | 添加新功能 | No        |

当app执行版本检查时，已经获得`v3`版本的用户现在被"回滚"到`v2`版本。此外，任何仍运行在`v2`版本的用户，因而将不会捕获到`v3`版本，因为他/她们已经在运行最新的版本（这就是为什么我们使用附加在版本标签里的包的hash来做版本检查）。


如果你想回滚部署环境到一个版本而不是前一个版本（如：`v3` -> `v2`），你可以指定一个可选的`--targetRelease`参数：

```
code-push rollback MyApp Production --targetRelease v34
```

*注意：由回滚产生的版本将会在`deployment history`命令的输出里被注释，以便助于更容易被辨识出来。*

## 查看发布历史

你可以使用如下命令查看某个应用的部署环境里最多50条最新的发布历史：

```
code-push deployment history <appName> <deploymentName>
```

这个历史纪录将显示每个版本的所有的属性（如：标签，强制性），也会标明任何版本是否由提升(promotion)或是回滚操作而来。

![Deployment History](https://cloud.githubusercontent.com/assets/696206/11605068/14e440d0-9aab-11e5-8837-69ab09bfb66c.PNG)

此外，历史记录显示每个版本的安装指标。你可以在文档的上面`deployment ls`命令处查看指标数据的解释明细。

默认情况下，历史纪录不会显示各个版本的作者，但是如果你是和其它开发者合作的，而且想看每个更新是谁发布的，那你可以给历史命令传额外的`--displayAuthor`(或`-a`)标记。

*注意：历史命令可以使用"h"别名来运行*

## 清除发布历史

你可以用如下命令清除相关的发布历史：

```
code-push deployment clear <appName> <deploymentName>
```

运行此命令后，那些已经配置了使用关联的部署密钥的客户端设备将不再接收被清除掉的更新。这个命令是不可逆的,因此不应该使用在生产部署。
