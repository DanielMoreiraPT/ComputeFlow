"""
# module ToUpercase

- Julia version:
- Author: anunia
- Date: 2020-04-26

# Examples

```jldoctest
julia>
```
"""
#using JSON
export ToUpercase_channel
#
module ToUpercase
using JSON
export ToUpercase_channel
#    include("FileReader.jl")


###############################################
#   UNMUTABLE part of module schema.
    struct Function_info
        name::String
        version::String
        id::UInt64
        Function_info(name, verion, id) =
            new(name, verion, id)
    end

    struct Port_info
        port_id
        port_type::String
        Port_info(id, type) = new(id, type)
    end

    struct InputInfo
        name::String
        version::String
        id::UInt64
        port::Port_info
        InputInfo(name, verion, id, port) =
            new(name, verion, id, port)
    end

    struct OutputInfo
        name::String
        version::String
        id::UInt64
        port::Port_info
        OurputInfo(name, verion, id, port) =
            new(name, verion, id, port)
    end

    struct IOinfo
        inputs::Array{Port_info, 1}
        outputs::Array{Port_info, 1}
        IOinfo(input_array, output_array) = new(input_array, output_array)
    end

############################################
#   MUTABLE part of module schema.

    func_info = Function_info("ToUpercase", "v.1.0.0",hash("ToUpercase"*"v.1.0.0"))
    ioinfo = nothing

    struct Options
        all_text::Bool
        just_first_letters::Bool
        from_the_begging::Bool
        fb_amount_of_char::Int64
        from_the_end::Bool
        fe_amount_of_char::Int64
        Options(all_text, just_first_letters, from_the_begging, fb_amount_of_char, from_the_end, fe_amount_of_char) =
            new(all_text, just_first_letters, from_the_begging, fb_amount_of_char, from_the_end, fe_amount_of_char)
    end


    function set_options()
        name = "/home/anunia/Documents/ComputeFlow/Computation/Aneta/16551191982327271023_options.json"


        #name = "$(func_info.id)_options.json"
        options = JSON.parse(read(name,String))

        all_text = get(options,"all_text",missing)
        just_first_letters = get(options,"just_first_letters",missing)
        from_the_begging = get(options,"from_the_begging",missing)
        fb_amount_of_char = get(options,"fb_amount_of_char",missing)
        from_the_end = get(options,"from_the_end",missing)
        fe_amount_of_char = get(options,"fe_amount_of_char",missing)
        Options(all_text, just_first_letters, from_the_begging, fb_amount_of_char, from_the_end, fe_amount_of_char)
    end
    function all_text(text)
        uppercase(text)
    end
    function just_first_letters(text)
        result = ""
        words = split(text, " ")
        for word in words
            if word != "" && word[1]>='a' && word[1]<='z'
                word[1] += "A" - "a"
                result *= word
            end
        end
        return result
    end
    function from_the_begging(text, amount)
        result = ""
        if length(text) <= amount
            println("---------------",length(text))
            all_text(text)
        else
            i=1
            for c in text
                d=(uppercase("$c"))
                println(i,d)
                if amount > i
                    result = result * d
                else
                    result = result * "$c"
                end
                i = i + 1
            end
        end
        println("--->",result)
        return result
    end
    function from_the_end(text, amount)
        textlength = length(text)
        result = ""
        if textlength <= amount
            all_text(text)
        else
            i=1
            for c in text
                d=(uppercase("$c"))
                println(i,d)
                if textlength - amount < i
                    result = result * d
                else
                    result = result * "$c"
                end
                i = i + 1
            end
        end
        return result
    end
    function get_text(ToUpercase_channel)
        println("========> get text\n")
        #println("fetch----->",fetch(ToUpercase_channel))

        txt = take!(ToUpercase_channel)
        #println(txt)
        return txt
    end
################# PROGRAM #################
function ToUpercase_f(ToUpercase_channel)

    println(func_info)
    options = set_options()
    println("OPTIONS-------> ", options)
    text = get_text(ToUpercase_channel)
    #println("==>", text)
    result = ""

    if options.all_text
        println("==> all_text")
        text = all_text(text)
    else
        if options.just_first_letters
            println("==> just_first_letters")
            text = just_first_letters(text)
        end
        if options.from_the_begging
            println("==> from_the_begging",options.fb_amount_of_char)
            text = from_the_begging(text,options.fb_amount_of_char)
        end
        if options.from_the_end
            println("==> from_the_end",options.fe_amount_of_char)
            text = from_the_end(text, options.fe_amount_of_char)
        end
    end
    write("txt_result2.txt",text)
    println("====",text)
    #close(ToUpercase_channel)
end
end
