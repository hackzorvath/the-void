#!/usr/bin/env ruby
# frozen_string_literal: true

require "json"
require "net/http"
require "uri"
require "fileutils"
require "date"

CACHE_DIR  = File.join(Dir.home, ".cache", "mirth")
CACHE_FILE = File.join(CACHE_DIR, "daily.json")
TODAY      = Date.today.iso8601

def read_cache
  return nil unless File.exist?(CACHE_FILE)

  data = JSON.parse(File.read(CACHE_FILE))
  return nil unless data.is_a?(Hash) && data["date"] == TODAY

  data
rescue
  nil
end

def write_cache(hash)
  FileUtils.mkdir_p(CACHE_DIR)
  File.write(CACHE_FILE, JSON.pretty_generate(hash))
rescue
  # cache failure is non-fatal
end

def http_get_json(url, headers: {})
  uri = URI(url)
  req = Net::HTTP::Get.new(uri)
  headers.each { |k, v| req[k] = v }

  res = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https") do |http|
    http.request(req)
  end

  raise "HTTP #{res.code}" unless res.is_a?(Net::HTTPSuccess)
  JSON.parse(res.body)
end

def fetch_zenquotes_today
  data = http_get_json("https://zenquotes.io/api/today")
  item = data.first || {}

  quote  = item["q"] || "Mirth is temporarily unavailable, but you remain magnificent."
  author = item["a"] || "Unknown"

  { "source" => "zenquotes", "quote" => quote, "author" => author }
end

def format_output(payload, plain: false)
  q = payload["quote"].to_s.strip
  a = payload["author"].to_s.strip

  if plain
    puts %Q{"#{q}" — #{a}}
  else
    puts "✨ MIRTH (#{Date.today.strftime("%b %-d, %Y")})"
    puts %Q{“#{q}”}
    puts "— #{a}"
  end
end

# ---- CLI ----
plain = ARGV.include?("--plain")
force = ARGV.include?("--force")

payload = (!force && read_cache) || fetch_zenquotes_today
payload["date"] = TODAY
write_cache(payload)

format_output(payload, plain: plain)
