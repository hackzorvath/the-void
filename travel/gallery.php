<HTML>

<head>
<title>Gallery</title>

<?php

  if($_GET['location'] == 'regina'   ||
     $_GET['location'] == 'toronto'  ||
     $_GET['location'] == 'virginia' ||
     $_GET['location'] == 'thailand' ||
     $_GET['location'] == 'laos'     ||
     $_GET['location'] == 'cambodia')
  {
    $location = $_GET['location'];
  }else { $location = 'toronto'; }

  $dir   = '/home3/zachhorvath/public_html/travel/photos/' . $location;
  $files = scandir($dir);

  $dirs = array_filter(glob('photos/*'), 'is_dir');
?>

<style>
::-webkit-scrollbar
{
    display: none;
}
header, nav, section, footer {
  background: transparent;
  color: black;
  position: absolute;
  left: 0px;
  width: 100%;
}
h1 {
  position: relative;
  color: white;
  text-shadow: 2px 2px 4px #000000;
}
h1, h2, h3 {
  font-family: verdana;
  font-size: 64px;
  text-align: center;
}
h2 { font-size: 32px; }
h3 { font-size: 24px; font-family: palatino; }

header {
  background-image: url("../img/pano/ocean.jpg");
  background-repeat: no-repeat;
  background-size: cover;

  height: 200px;
  top: 0px;
}
nav {
  background: transparent;
  text-align: center;
  top: 150;
}

section {
  top: 200;
}
article {
  margin: auto;
  font-family: palatino;
  text-align: center;
  width: 75%;
  box-shadow: 2px 2px 4px black;

}


footer {
  background: gray;
  position: fixed;
  bottom: 0;
  height: 50px;
  text-align: center;
}


a.nav {
  background: transparent;
  font-family: verdana;
  font-size: 16px;
  color: white;
  position: relative;

  width: 120px;

  padding: 6px 12px;
  border: 2px solid white;
  border-radius: 16px;
  text-decoration:none;
  transition-duration: 0.2s;
}
a.nav:hover{
  background: white;
  color: black;
}

footer img {
  height: 32px;
  width: 32px;
  margin: 10px;
}
article img {
  align: center;
  max-width: 720px;
  max-height: 640px;
  margin: 50px;
}

div.narrow {
  align: center;
  margin: auto;
  width: 50%;
}

#chartdiv {
  width: 100%;
  height: 600px;
  z-index: 10;
}

</style>
</head>


<header>
  <h1>Gallery</h1>
</header>


<body>

<nav>
  <a href="../index.html" class="nav">Home</a>
  <a href="../about/index.html" class="nav">About</a>
  <a href="../travel/index.html" class="nav">Travel</a>
  <a href="../research/index.html" class="nav">Research</a>
  <a href="../showcase/index.html" class="nav">Showcase</a>
</nav>

<section>
  <br><br><br><br>
  <h2>Photos from <?php echo ucfirst($location) ?></h2>
<?php
  foreach ($files as &$file) 
  {
    if($file == '.') continue;
    if($file == '..') continue;
?>
  <article>
    <img src="photos/<?php echo($location . '/' . $file); ?>" /> 
  </article>
  <br><br>
<?php
  }
?>
  <br><br><br>
</section>

<footer>
    <a href="https://www.facebook.com/Dr.Zaach">
    <img src="../img/icon/facebook.png"></a>
    <a href="https://www.instagram.com/zach_horvath">
    <img src="../img/icon/instagram.png"></a>
    <a href="https://www.linkedin.com/in/zach-horvath-b560b4129/">
    <img src="../img/icon/linkedin.png"></a>
    <a href="https://github.com/CaptainZach">
    <img src="../img/icon/github.png"></a>
</footer>

</body>
</HTML>