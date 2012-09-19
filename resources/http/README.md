# http


# usage

    var big = require("big");
    big.use("http");

## http

#### [properties](#http-properties)

  - [port](#http-properties-port)

  - [host](#http-properties-host)

  - [root](#http-properties-root)


#### [methods](#http-methods)

  - [start](#http-methods-start) (options, callback)


<a name="http-properties"></a>

## properties 


- **port** 

  - **type** : string

  - **default** : 8888

  - **description** : the port to listen on 

- **host** 

  - **type** : string

  - **default** : 0.0.0.0

  - **description** : the host interface to listen on

- **root** 

  - **type** : string

  - **default** : /Users/maraksquires/dev/big/resources/http/public


<a name="http-methods"></a> 

## methods 

<a name="http-methods-start"></a> 

### http.start(options, callback)

starts an http server

- **options** 

  - **type** : object

  - **properties**

    - **port** 

      - **type** : string

      - **default** : 8888

      - **description** : the port to listen on 

    - **host** 

      - **type** : string

      - **default** : 0.0.0.0

      - **description** : the host interface to listen on

    - **root** 

      - **type** : string

      - **default** : /Users/maraksquires/dev/big/resources/http/public

- **callback** 

  - **description** : the callback executed after server listen

  - **type** : function

  - **required** : false


*README auto-generated with [big-docs](https://github.com/bigcompany/big/resources/tree/master/docs)*