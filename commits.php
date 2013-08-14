<?php

header('Content-type: application/rss+xml; charset=UTF-8');
?>
<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
	<title>Puttr Commits</title>
	<description>The Puttr commit log messages</description>
	<link>http://puttr.net/</link>
<?php

$xml = `svn log --xml file:///var/svn/puttr`;
$elem = simplexml_load_string($xml);

$logs = $elem->xpath('/log/logentry');

foreach($logs as $log) {
	$item = '<item>';
	$title = htmlentities('Commit r' . $log->attributes()->revision);
	$item .= '<title>' . $title . '</title>';
	$description = htmlentities((string)$log->msg);
	$item .= "<description>$description</description>";
	$item .= '<link>http://puttr.net/</link>';
	$item .= '<guid>' . (int)$log->attributes()->revision . '</guid>';
	$date = strtotime((string)$log->date);
	$date = htmlentities(date(DATE_RSS, $date));
	$item .= '<pubDate>' . $date . '</pubDate>';
	$item .= '</item>';
	echo $item, "\n";
}
?>
</channel>
</rss>
