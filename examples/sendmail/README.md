# sendmailBatch

mailgun API を用いたメールの一括送信 API

## Usage

1. `.cc_config.yaml` の `<YOUR_API_KEY>` に mailgun の API key を入力します

```
credentials:
  - api: mailgun API
    basicAuth: api:<YOUR_API_KEY>
```

2. Cloud9 メニューの「Compile&Run」を押下します
3. コンソールに「completed to compile and run the instance.」が表示され，数分待ちます
4. example.csv を作成します

```
aaa,aaa@jp.fujitsu.com
bbb,bbb@jp.fujitsu.com
ccc,ccc@jp.fujitsu.com
```

5. http://launcher.cc.soft.flab.fujitsu.co.jp/docs/ を開きます．ユーザ名，パスワードは Kong に登録したものです

6. GET /instances の「Try it out!」を押下し，インスタンス ID（以下の例では `5ecde9c4-cec4-4e3b-b572-8d840d7984c4` ）を取得します

```
[
  "5ecde9c4-cec4-4e3b-b572-8d840d7984c4"
]
```

7. 画面上部の入力ボックスにある `http://launcher.cc.soft.flab.fujitsu.co.jp/api-docs` を `http://launcher.cc.soft.flab.fujitsu.co.jp/v1/instances/5ecde9c4-cec4-4e3b-b572-8d840d7984c4/spec` に変更し，「explore」を押下します

8. 各々の「Try it out!」で動作確認できます．
