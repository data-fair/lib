
  'use strict'

  

// eslint-disable-next-line
const STR_ESCAPE = /[\u0000-\u001f\u0022\u005c\ud800-\udfff]|[\ud800-\udbff](?![\udc00-\udfff])|(?:[^\ud800-\udbff]|^)[\udc00-\udfff]/

class Serializer {
  constructor (options = {}) {
    switch (options.rounding) {
      case 'floor':
        this.parseInteger = Math.floor
        break
      case 'ceil':
        this.parseInteger = Math.ceil
        break
      case 'round':
        this.parseInteger = Math.round
        break
      default:
        this.parseInteger = Math.trunc
        break
    }
  }

  asInteger (i) {
    if (typeof i === 'bigint') {
      return i.toString()
    } else if (Number.isInteger(i)) {
      return '' + i
    } else {
      /* eslint no-undef: "off" */
      const integer = this.parseInteger(i)
      if (Number.isNaN(integer) || !Number.isFinite(integer)) {
        throw new Error(`The value "${i}" cannot be converted to an integer.`)
      } else {
        return '' + integer
      }
    }
  }

  asNumber (i) {
    const num = Number(i)
    if (Number.isNaN(num)) {
      throw new Error(`The value "${i}" cannot be converted to a number.`)
    } else if (!Number.isFinite(num)) {
      return null
    } else {
      return '' + num
    }
  }

  asBoolean (bool) {
    return bool && 'true' || 'false' // eslint-disable-line
  }

  asDateTime (date) {
    if (date === null) return '""'
    if (date instanceof Date) {
      return '"' + date.toISOString() + '"'
    }
    if (typeof date === 'string') {
      return '"' + date + '"'
    }
    throw new Error(`The value "${date}" cannot be converted to a date-time.`)
  }

  asDate (date) {
    if (date === null) return '""'
    if (date instanceof Date) {
      return '"' + new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 10) + '"'
    }
    if (typeof date === 'string') {
      return '"' + date + '"'
    }
    throw new Error(`The value "${date}" cannot be converted to a date.`)
  }

  asTime (date) {
    if (date === null) return '""'
    if (date instanceof Date) {
      return '"' + new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(11, 19) + '"'
    }
    if (typeof date === 'string') {
      return '"' + date + '"'
    }
    throw new Error(`The value "${date}" cannot be converted to a time.`)
  }

  asString (str) {
    const quotes = '"'
    if (str instanceof Date) {
      return quotes + str.toISOString() + quotes
    } else if (str === null) {
      return quotes + quotes
    } else if (str instanceof RegExp) {
      str = str.source
    } else if (typeof str !== 'string') {
      str = str.toString()
    }

    // Fast escape chars check
    if (!STR_ESCAPE.test(str)) {
      return quotes + str + quotes
    }

    if (str.length < 42) {
      return this.asStringSmall(str)
    } else {
      return JSON.stringify(str)
    }
  }

  // magically escape strings for json
  // relying on their charCodeAt
  // everything below 32 needs JSON.stringify()
  // every string that contain surrogate needs JSON.stringify()
  // 34 and 92 happens all the time, so we
  // have a fast case for them
  asStringSmall (str) {
    const l = str.length
    let result = ''
    let last = 0
    let found = false
    let surrogateFound = false
    let point = 255
    // eslint-disable-next-line
    for (var i = 0; i < l && point >= 32; i++) {
      point = str.charCodeAt(i)
      if (point >= 0xD800 && point <= 0xDFFF) {
        // The current character is a surrogate.
        surrogateFound = true
      }
      if (point === 34 || point === 92) {
        result += str.slice(last, i) + '\\'
        last = i
        found = true
      }
    }

    if (!found) {
      result = str
    } else {
      result += str.slice(last)
    }
    return ((point < 32) || (surrogateFound === true)) ? JSON.stringify(str) : '"' + result + '"'
  }
}

  

  const serializer = new Serializer({"mode":"standalone","schema":{"https://github.com/data-fair/lib/session-state":{"$id":"https://github.com/data-fair/lib/session-state","type":"object","title":"session state","properties":{"user":{"$ref":"#/definitions/user"},"organization":{"$ref":"#/definitions/organizationMembership"},"account":{"$ref":"#/definitions/account"},"accountRole":{"type":"string"},"lang":{"type":"string"},"dark":{"type":"boolean"}},"definitions":{"organizationMembership":{"type":"object","additionalProperties":false,"required":["id","name","role"],"properties":{"id":{"type":"string"},"name":{"type":"string"},"role":{"type":"string"},"department":{"type":"string"},"departmentName":{"type":"string"},"dflt":{"type":"boolean"}}},"userRef":{"type":"object","additionalProperties":false,"required":["id","name"],"properties":{"id":{"type":"string"},"name":{"type":"string"}}},"user":{"type":"object","additionalProperties":false,"required":["email","id","name","organizations"],"properties":{"email":{"type":"string","format":"email"},"id":{"type":"string"},"name":{"type":"string"},"organizations":{"type":"array","items":{"$ref":"#/definitions/organizationMembership"}},"isAdmin":{"type":"integer","enum":[0,1]},"adminMode":{"type":"integer","enum":[0,1]},"asAdmin":{"$ref":"#/definitions/userRef"},"pd":{"type":"string","format":"date"},"ipa":{"type":"integer","enum":[0,1]}}},"account":{"type":"object","additionalProperties":false,"required":["type","id","name"],"properties":{"type":{"type":"string","enum":["user","organization"]},"id":{"type":"string"},"name":{"type":"string"},"department":{"type":"string"},"departmentName":{"type":"string"}}}}}}})
  

  
    function main (input) {
      let json = ''
      json += anonymous0(input)
      return json
    }
    
    function anonymous3 (input) {
      // #/definitions/organizationMembership
  
      var obj = (input && typeof input.toJSON === 'function')
    ? input.toJSON()
    : input
  
      var json = '{'
      var addComma = false
  
      if (obj["id"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"id\"" + ':'
      json += serializer.asString(obj["id"])
      } else {
        throw new Error('"id" is required!')
      
      }
    
      if (obj["name"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"name\"" + ':'
      json += serializer.asString(obj["name"])
      } else {
        throw new Error('"name" is required!')
      
      }
    
      if (obj["role"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"role\"" + ':'
      json += serializer.asString(obj["role"])
      } else {
        throw new Error('"role" is required!')
      
      }
    
      if (obj["department"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"department\"" + ':'
      json += serializer.asString(obj["department"])
      }
    
      if (obj["departmentName"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"departmentName\"" + ':'
      json += serializer.asString(obj["departmentName"])
      }
    
      if (obj["dflt"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"dflt\"" + ':'
      json += serializer.asBoolean(obj["dflt"])
      }
    
      json += '}'
      return json
    }
  

    function anonymous2 (obj) {
      // #/definitions/user/properties/organizations
  
    if (!Array.isArray(obj)) {
      throw new TypeError(`The value '${obj}' does not match schema definition.`)
    }
    const arrayLength = obj.length
  
      if (arrayLength > undefined) {
        throw new Error(`Item at undefined does not match schema definition.`)
      }
    
    let jsonOutput = ''
  
      for (let i = 0; i < arrayLength; i++) {
        let json = ''
        json += anonymous3(obj[i])
        jsonOutput += json
        if (i < arrayLength - 1) {
          jsonOutput += ','
        }
      }
    return `[${jsonOutput}]`
  }

    function anonymous4 (input) {
      // #/definitions/userRef
  
      var obj = (input && typeof input.toJSON === 'function')
    ? input.toJSON()
    : input
  
      var json = '{'
      var addComma = false
  
      if (obj["id"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"id\"" + ':'
      json += serializer.asString(obj["id"])
      } else {
        throw new Error('"id" is required!')
      
      }
    
      if (obj["name"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"name\"" + ':'
      json += serializer.asString(obj["name"])
      } else {
        throw new Error('"name" is required!')
      
      }
    
      json += '}'
      return json
    }
  

    function anonymous1 (input) {
      // #/definitions/user
  
      var obj = (input && typeof input.toJSON === 'function')
    ? input.toJSON()
    : input
  
      var json = '{'
      var addComma = false
  
      if (obj["email"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"email\"" + ':'
      json += serializer.asString(obj["email"])
      } else {
        throw new Error('"email" is required!')
      
      }
    
      if (obj["id"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"id\"" + ':'
      json += serializer.asString(obj["id"])
      } else {
        throw new Error('"id" is required!')
      
      }
    
      if (obj["name"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"name\"" + ':'
      json += serializer.asString(obj["name"])
      } else {
        throw new Error('"name" is required!')
      
      }
    
      if (obj["organizations"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"organizations\"" + ':'
      json += anonymous2(obj["organizations"])
      } else {
        throw new Error('"organizations" is required!')
      
      }
    
      if (obj["isAdmin"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"isAdmin\"" + ':'
      json += serializer.asInteger(obj["isAdmin"])
      }
    
      if (obj["adminMode"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"adminMode\"" + ':'
      json += serializer.asInteger(obj["adminMode"])
      }
    
      if (obj["asAdmin"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"asAdmin\"" + ':'
      json += anonymous4(obj["asAdmin"])
      }
    
      if (obj["pd"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"pd\"" + ':'
      json += serializer.asDate(obj["pd"])
      }
    
      if (obj["ipa"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"ipa\"" + ':'
      json += serializer.asInteger(obj["ipa"])
      }
    
      json += '}'
      return json
    }
  

    function anonymous5 (input) {
      // #/definitions/account
  
      var obj = (input && typeof input.toJSON === 'function')
    ? input.toJSON()
    : input
  
      var json = '{'
      var addComma = false
  
      if (obj["type"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"type\"" + ':'
      json += serializer.asString(obj["type"])
      } else {
        throw new Error('"type" is required!')
      
      }
    
      if (obj["id"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"id\"" + ':'
      json += serializer.asString(obj["id"])
      } else {
        throw new Error('"id" is required!')
      
      }
    
      if (obj["name"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"name\"" + ':'
      json += serializer.asString(obj["name"])
      } else {
        throw new Error('"name" is required!')
      
      }
    
      if (obj["department"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"department\"" + ':'
      json += serializer.asString(obj["department"])
      }
    
      if (obj["departmentName"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"departmentName\"" + ':'
      json += serializer.asString(obj["departmentName"])
      }
    
      json += '}'
      return json
    }
  

    function anonymous0 (input) {
      // #
  
      var obj = (input && typeof input.toJSON === 'function')
    ? input.toJSON()
    : input
  
      var json = '{'
      var addComma = false
  
      if (obj["user"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"user\"" + ':'
      json += anonymous1(obj["user"])
      }
    
      if (obj["organization"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"organization\"" + ':'
      json += anonymous3(obj["organization"])
      }
    
      if (obj["account"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"account\"" + ':'
      json += anonymous5(obj["account"])
      }
    
      if (obj["accountRole"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"accountRole\"" + ':'
      json += serializer.asString(obj["accountRole"])
      }
    
      if (obj["lang"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"lang\"" + ':'
      json += serializer.asString(obj["lang"])
      }
    
      if (obj["dark"] !== undefined) {
        
  if (addComma) {
    json += ','
  } else {
    addComma = true
  }

        json += "\"dark\"" + ':'
      json += serializer.asBoolean(obj["dark"])
      }
    
      json += '}'
      return json
    }
  
    
  

  module.exports = main
      