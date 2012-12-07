<h2>{$test}</h2>
<ul>
{foreach from="$list" item="value" key="name"}
    <li><a>{$name}</a><b>{$value}</b></li>
{/foreach}
</ul>