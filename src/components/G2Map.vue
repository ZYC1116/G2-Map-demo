<template>
  <div class="G2Map">

    <!--内容：描述+地图-->
    <div class="content">
      <div class="contentbox">
        <div class="info">
          <svg class="svg-map" height="400">
            <!--日期-->
            <rect id="dateTextBg" fill="#595757" height="40" width="240"/>
            <text id="dateText" fill="#fff" style="font-size:26px" x="110" y="30" text-anchor="middle">{{date}}</text>
            <!--数字和-->
            <g>
              <rect width="36" height="4" fill="#000000" y="80"></rect>
              <text id="total" fill="#000000" style="font-size:42" y="130" text-anchor="start">{{num}}</text>
            </g>
            <!--图例-->
            <g>
              <circle cx="45" cy="188" r="8.662419913591103" stroke="#383838" fill-opacity="0"></circle>
              <text fill="#000000" style="font-size:22" x="110" y="194" text-anchor="start">300</text>
            </g>
            <g>
              <circle cx="45" cy="218" r="15.815342630852664" stroke="#383838" fill-opacity="0"></circle>
              <text fill="#000000" style="font-size:22" x="110" y="224" text-anchor="start">1000</text>
            </g>
            <g>
              <circle cx="45" cy="266" r="27.392976975746848" stroke="#383838" fill-opacity="0"></circle>
              <text fill="#000000" style="font-size:22" x="110" y="272" text-anchor="start">3000</text>
            </g>
            <g>
              <circle cx="45" cy="340" r="40" stroke="#383838" fill-opacity="0"></circle>
              <text fill="#000000" style="font-size:22" x="110" y="346" text-anchor="start">10000</text>
            </g>
            <line x1="45" y1="188" x2="45" y2="340" stroke="#383838" stroke-width="1" stroke-dasharray="4,4"></line>
          </svg>
        </div>
        <!--地区气泡图-->
        <div id="province" ref="province"></div>
      </div>
    </div>

    <!--级联选择切换地区-->
    <div class="th-sel">
      <div class="th-sel-title">切换地区</div>
      <div class="th-sel-inputs">
        <select v-model="province">
          <option :key="item" :value="item" v-for="(item) in provinceBox">{{item}}</option>
        </select>
      </div>
      <div class="th-sel-inputs" v-if="cityBox.length">
        <select v-model="city">
          <option :key="item" :value="item" v-for="(item) in cityBox">{{item}}</option>
        </select>
      </div>
    </div>

  </div>
</template>

<script>
import * as G2 from '@antv/g2'
import AMapUI from 'AMapUI'
import DataSet from '@antv/data-set'

export default {
  // component: ,
  name: 'G2Map',
  data () {
    return {
      province: '', // 当前选中的省级名称
      provinceBox: [], // 所有省份
      provinceToCity: {}, // 记录省级对应的市级
      provinceCode: {}, // 记录地区编码
      city: '', // 当前选中的市级
      cityBox: [], // 所有市
      center: {}, // 地理位置
      chart: null, // 图表实例
      date: '2021-01-08',
      num: 0
    }
  },
  created () {
    fetch('../static/china.json').then(res => res.json())
      .then(res => {
        // 获取所有省级地区
        res.children.forEach(item => {
          this.provinceBox.push(item.name)
          this.provinceCode[item.name] = item.adcode
          this.provinceToCity[item.name] = {}
          this.provinceToCity[item.name].children = item.children
          this.center[item.name] = item.center
        })

        // 默认显示北京市的数据
        this.province = this.provinceBox[0]
      })
  },
  methods: {
    // 获取省级下的市级区域列表
    getCity (name) {
      let citys = this.provinceToCity[name].children
      if (citys !== undefined) {
        citys.forEach(item => {
          this.center[item.name] = item.center
          if (item.level !== 'district') {
            this.cityBox.push(item.name)
            this.provinceCode[item.name] = item.adcode
            let districts = item.children
            if (districts !== undefined) {
              districts.forEach(item => {
                this.provinceCode[item.name] = item.adcode
                this.center[item.name] = item.center
              })
            }
          }
        })
      }
    },
    // 根据地区代码创建地图实例
    drawMap (adcode) {
      const that = this
      AMapUI.load(['ui/geo/DistrictExplorer', 'lib/$'], function (DistrictExplorer) {
        // 创建一个实例
        var districtExplorer = new DistrictExplorer()
        districtExplorer.loadAreaNode(adcode, function (error, areaNode) {
          if (error) {
            console.log(error)
          }
          // 将node信息暴露出去
          that.renderG2Map(areaNode)
        })
      })
    },
    // 绘制G2地图
    renderG2Map (areaNode) {
      this.num = 0
      var geoJSON = areaNode.getSubFeatures() // 获取 geoJSON 数据
      console.log(geoJSON)

      // 图表已存在则需重建
      this.chart && this.chart.destroy()
      this.chart = null
      if (!geoJSON) {
        return
      }

      // 用户数据(TODO：引用外部数据，和日期相关联)
      var userData = []
      for (var i = 0; i < geoJSON.length; i++) {
        var geoName = geoJSON[i].properties.name
        let temp = {
          name: geoName,
          value: Math.round(Math.random() * 10000),
          longitude: this.center[geoName][0],
          latitude: this.center[geoName][1]
        }
        userData.push(temp)
        this.num += temp.value
      }

      var ds = new DataSet() // 新建数据集
      var mapData = {
        type: 'FeatureCollection',
        features: geoJSON
      }
      // geoJSON 经纬度数据
      var geoDataView = ds.createView().source(mapData, {
        type: 'GeoJSON'
      })

      // 数据封装
      var dv = ds.createView().source(userData)
      dv.transform({
        type: 'geo.region',
        field: 'name',
        geoDataView: geoDataView,
        as: ['longitude', 'latitude']
      })

      // 计算地图的最佳宽高
      var longitudeRange = geoDataView.range('longitude')
      var lantitudeRange = geoDataView.range('latitude')
      var ratio = (longitudeRange[1] - longitudeRange[0]) / (lantitudeRange[1] - lantitudeRange[0])
      var width = 300 * ratio
      var height = 400
      if (width > this.$refs.province.offsetWidth) {
        width = this.$refs.province.offsetWidth
        height = width / ratio
      }

      // 创建图表实例
      this.chart = new G2.Chart({
        container: 'province',
        width: width,
        height: height,
        padding: 0
      }).tooltip(false).legend(false).scale({
        longitude: {
          sync: true
        },
        latitude: {
          sync: true
        }
      })

      // 绘制地图
      const bgView = this.chart.createView().source(dv.rows)
      bgView.axis(false).tooltip(false).polygon()
        .position(['longitude', 'latitude']).style({
          fill: '#F2F2F2',
          stroke: '#727272',
          fillOpacity: 0.85
        })

      // 获取地理位置中心绘制气泡
      const userDv = ds.createView().source(userData)

      const popView = this.chart.createView().source(userDv.rows).axis(false)
      popView.point().position(['longitude', 'latitude'])
        .shape('circle')
        .size('value', [10, 40])
        .style({
          fillOpacity: 0.7,
          stroke: 'rgb(8, 81, 156)'
        })
        .color('value', '#BAE7FF-#0050B3-#4077b0')

      this.chart.render()
    }

  },
  watch: {
    province: function () {
      this.cityBox = []
      this.city = ''
      this.getCity(this.province)
      this.drawMap(this.provinceCode[this.province])
    },
    city: function () {
      if (this.city) {
        this.drawMap(this.provinceCode[this.city])
      }
    }
  }
}
</script>

<style scoped>
.G2Map {
  display: flex;
  justify-content: center;
}
.info {
  display: flex;
  align-items: center;
}
.svg-map {
  background: rgb(255, 255, 255);
}
.contentbox {
  display: flex;
  width: max-content;
  padding: 20px;
  border: 1px black solid;
  border-radius: 8px;
  box-shadow: rgb(140 140 140 / 22%) 0px 0px 26px;
}
#province {
  width:600px;
  height: 400px;
  line-height: 400px;
}
.th-sel {
  margin-left: 10px;
  font-size: 24px;
  text-align: left;
}
</style>
