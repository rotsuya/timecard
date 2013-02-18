# timecard

シンプルなタイムカードを実現するWebアプリです。私の職場はフレックスタイム制で、毎日の出退勤時間を記録する必要があるため、作りました。

一度書けば、すべての環境で動く、Webアプリの特長を実証する習作としても位置付けています。

対応状況は以下のとおりです。

<table>
<tr><th>OS</th><th>ブラウザ</th><th>対応状況</th</tr>
<tr><td rowspan="2">iOS</td><td>Mobile Safari</td><td>Done</td></tr>
<tr><td>Native Apps (PhoneGap, Cordova)</td><td>To Do</td></tr>
<tr><td rowspan="5">Android 4.0+</td><td>Browser</td><td>Done</td></tr>
<tr><td>Chrome</td><td>Done</td></tr>
<tr><td>Native Apps (PhoneGap, Cordova)</td><td>Done</td></tr>
<tr><td>Firefox</td><td>To Do</td></tr>
<tr><td>Firefox Hosted Apps</td><td>To Do</td></tr>
<tr><td rowspan="4">Mac<td><td>Safari</td><td>Done</td></tr>
<tr><td>Chrome</td><td>Done</td></tr>
<tr><td>Firefox</td><td>Done</td></tr>
<tr><td>Firefox Hosted Apps</td><td>Done</td></tr>
<tr><td rowspan="3">Firefox OS Simulator</td><td>Browser</td><td>Done</td></tr>
<tr><td>Hosted Apps</td><td>Done</td></tr>
<tr><td>Packaged Apps</td><td>Done</td></tr>
</table>

## 特徴

* シンプルなHTMLと、GPUアクセラレーションを生かしたCSSアニメーションで軽快に動作します。
* 日本標準時サーバと自動的に時刻を同期するため、端末の時間がずれていても、正確な時間を記録できます。
* 時刻をlocalStorage (WebStorage) に保存します。
* Application Cacheにより、オフラインでも利用できます。
* iOSでホーム画面にブックマーク(ウェブクリップ)するとネイティブアプリのように利用できます。

## デモ

* [timecardデモページ](http://rotsuya.github.com/timecard/)

## 使用方法

* Arriveボタンで出勤時間を打刻できます。
* Leaveボタンで退勤時間を打刻できます。
* 左右にスワイプすると、前後の月のカードを見ることができます。