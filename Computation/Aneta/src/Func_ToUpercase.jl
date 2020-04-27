"""
    Func_ToUpercase()

- Julia version:
- Author: anunia
- Date: 2020-04-27

# Arguments

# Examples

```jldoctest
julia>
```
"""
    #\export ToUpercase_channel
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
        name = "$(func_info.id)_options.json"
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
        result
    end
    function from_the_begging(text, amount)
        if length(text) >= amount
            all_text(text)
        else
            for i = 1:amount
                text[i] += "A" - "a"
            end
        end
    end
    function from_the_end(text, amount)
        textlength = length(text)
        if textlength >= amount
            all_text(text)
        else

            for i = 1:amount
                text[textlength - i] += "A" - "a"
            end
        end
        result
    end
    function get_text()
        println("========> get text")
        txt = take!(ToUpercase_channel)
        println(txt)
        return txt
    end
################# PROGRAM #################
using JSON
ToUpercase_channel = Channel(1)

get_channel() = ToUpercase_channel
export ToUpercase_channel, get_channel

    function Func_ToUpercase()

        func_info = Function_info("ToUpercase", "v.1.0.0",hash("ToUpercase"*"v.1.0.0"))
        ioinfo = nothing



        println(func_info)
        options = set_options()
        println("1")
        text = get_text()
        println("==>", text)
        result = ""

        if options.all_text
            result = all_text(text)
        else
            if options.just_first_letters
                result = just_first_letters(text)
            elseif options.from_the_begging
                result = from_the_begging(text,options.fb_amount_of_char)
            elseif options.from_the_end
                result = from_the_end(text, fe_amount_of_char)
            end
        end
        #write("txt_result.txt",result)
        println("====",result)
        close(ToUpercase_channel)
    end
