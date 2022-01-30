# 个人樱花引导页
注意：
此源码是基于 [Dimension](https://html5up.net/dimension "Dimension") 的二次修改

Demo 1：[https://nianbroken.github.io/Personal_Sakura_Guide_Page/](https://nianbroken.github.io/Personal_Sakura_Guide_Page/ "https://nianbroken.github.io/Personal_Sakura_Guide_Page/")

Demo 2：[https://www.nianbroken.top/](https://www.nianbroken.top/ "https://www.nianbroken.top/")

------------

### 更新日志：

#### 1.2 - 2022年1月30日

- 更正错别字“途径”→“途经”（她只是**途经**我留下了星火 而我却任凭它焚烧了我整个荒原）
- 修复页面中头像周围出现两个圆框
- 新增版权信息的年份支持自动更新
- 底部新增一条文案
- 修复其他Bug



#### 1.1 - 2021年7月21日

- 修复 **Svg 无法显示** 的问题
- 增加 **Meta Description** 优化SEO
- 增加 **图像的 Alt 属性** 优化SEO
- 增加 **Meta Language 标记** 优化SEO
- 增加 **万能收款码** （需自行修改 `\money_receiving_QR_code\index.html` 相关参数）
- 此版本可通过Bing、Google搜索引擎的质量检查

------------

### 修改内容：

1. 将页面内头像改为本地头像
2. 将原本的背景替换为动态樱花背景（参考自 [fwxiaohan.github.io](https://github.com/fwxiaohan/fwxiaohan.github.io "fwxiaohan.github.io") ）
3. 去除`<li>`标签的锚点链接，改为文本链接
4. 去除超链接下方的横线

main.css内的

```css
border-bottom: dotted 1px rgba(255, 255, 255, 0.5);
```

5. 去除页面中间的黑色块块

main.css内的

```css
background-image: -webkit-radial-gradient(rgba(0, 0, 0, 0.25) 25%, rgba(0, 0, 0, 0) 55%);
background-image: radial-gradient(rgba(0, 0, 0, 0.25) 25%, rgba(0, 0, 0, 0) 55%);
```

6. 增加显示访问者IP地址（调用 [https://pv.sohu.com/cityjson?ie=utf-8](https://pv.sohu.com/cityjson?ie=utf-8 "https://pv.sohu.com/cityjson?ie=utf-8") 接口）

------------

### Dimension与个人樱花引导页的对比：

> #### Dimension
>
> [![Dimension](https://blog.nianbroken.top/usr/uploads/2021/05/2403737638.png "Dimension")](https://html5up.net/dimension "Dimension")


> #### 个人樱花引导页
>
> 静态图
> [![碎念个人樱花引导页静态图](https://blog.nianbroken.top/usr/uploads/2021/05/1477674244.png "碎念个人樱花引导页静态图")](https://www.nianbroken.top/ "碎念个人樱花引导页静态图")

> 动态图
> [![碎念个人樱花引导页动态图](https://blog.nianbroken.top/usr/uploads/2021/05/3974157131.gif "碎念个人樱花引导页动态图")](https://www.nianbroken.top/ "碎念个人樱花引导页动态图")

由于Gif较大，可能加载不出来或加载比较慢，建议直接点击图片跳转至演示站查看。
