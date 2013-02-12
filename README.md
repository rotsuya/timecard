# timecard

シンプルなタイムカードを実現するWebアプリです。私の職場はフレックスタイム制で、毎日の出退勤時間を記録する必要があるため、必要に迫られて作りました。

## 特徴

* シンプルなHTMLと、CSSアニメーションにより、高速、軽快に動作します。
* 日本標準時サーバと自動的に時刻を同期するため、端末の時間がずれていても、正確な時間を記録できます。
* 時刻をlocalStorage (WebStorage) に保存します。
* Application Cacheにより、オフラインでも利用できます。
* iOSでホーム画面に保存するとネイティブアプリのように利用できます。

## デモ

* [timecardデモページ](http://rotsuya.github.com/timecard/index.html)

## 使用方法

* Arriveボタンで出勤時間を打刻できます。
* Leaveボタンで退勤時間を打刻できます。
* 左右にスワイプすると、前後の月のカードを見ることができます。

## 業務連絡

オフラインアクセスは、以下の行で実現しています。

index.html

```html
<html manifest="cache.appcache">
```
timecard.js

```javascript
applicationCache.addEventListener('updateready', function() {
    console.log('detect cache update. update cache.')
    applicationCache.swapCache();
    location.reload();
}, false);

if (navigator.onLine) {
    try {
        applicationCache.update();
        console.log('check cache manifest.')
    } catch(e) {
        console.log(e);
    }
}
```
cache.appcache

    CACHE MANIFEST
    # version 20121011-1808
    
    CACHE:
    ./
    index.html
    timecard.css
    timecard.js
    getjst/getjst.js
    
    NETWORK:
    *

.htaccess

    AddType text/cache-manifest .appcache
