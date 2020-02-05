/* eslint-disable import/no-unresolved, import/extensions */
import React, { useMemo, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import {
  Animated,
  Easing,
  View,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native'
/* eslint-enable import/no-unresolved, import/extensions */
import Color from 'color'
import { ViewPropTypes } from '../utils'
import { black } from '../styles/colors'
import { ELEVATION_ZINDEX } from '../styles/constants'

// import ThemeContext from './themeContext'

const propTypes = {
  testID: PropTypes.string,
  color: PropTypes.string,
  /**
   * Max opacity of ripple effect
   */
  maxOpacity: PropTypes.number,
  /**
   * If true, the interaction will be forbidden
   */
  disabled: PropTypes.bool,
  /**
   * It'll be used instead of icon (see props name) if exists
   */
  children: PropTypes.element,
  /**
   * Call when icon was pressed
   */
  onPress: PropTypes.func,
  onLongPress: PropTypes.func,
  onPressIn: PropTypes.func,
  onPressOut: PropTypes.func,
  style: PropTypes.shape({
    container: ViewPropTypes.style,
  }),
}
const defaultProps = {
  testID: null,
  children: null,
  onPress: null,
  onLongPress: null,
  onPressIn: null,
  onPressOut: null,
  color: Color(black)
    .alpha(0.87)
    .toString(),
  disabled: false,
  maxOpacity: 0.16,
  style: {},
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
})

/**
 * Usualy we use width and height to compute this. In case, the width of container is too big
 * we use this constant as a width of ripple effect.
 */
const MAX_DIAMETER = 200

const isRippleVisible = ({ onPress, onLongPress, onPressIn, onPressOut }) =>
  onPress || onLongPress || onPressIn || onPressOut

// class RippleFeedback extends PureComponent {
const RippleFeedback = props => {
  // const context = React.useContext(ThemeContext);
  const [diameter, setDiameter] = useState(MAX_DIAMETER);
  const [maxOpacity, setMaxOpacity] = useState(0);
  const [rippleColor, setRippleColor] = useState(Color(props.color));
  const [longPress, setLongPress] = useState(false);
  const [pressX, setPressX] = useState(0);
  const [pressY, setPressY] = useState(0);

  const { opacityRippleValue, opacityBackgroundValue, scaleValue } = useMemo(() => ({
    opacityRippleValue: new Animated.Value(0),
    opacityBackgroundValue: new Animated.Value(0),
    scaleValue: new Animated.Value(0)
  }), []);

  useEffect(() => {
    const _maxOpacity = Color(props.color).isDark() ? 0.12 : 0.3
    opacityRippleValue.setValue(_maxOpacity);
    setMaxOpacity(_maxOpacity);
    setRippleColor(Color(props.color));
  }, [props.color]);


  const onLayoutChanged = event => {
    try {
      // get width and height of wrapper
      const {
        nativeEvent: {
          layout: { width, height },
        },
      } = event
      const diameter = Math.ceil(Math.sqrt(width * width + height * height))

      setDiameter(Math.min(diameter, MAX_DIAMETER));
    } catch (e) {
      setDiameter(MAX_DIAMETER);
    }
  };

  const onLongPress = () => {
    const { onLongPress } = props;

    // Long press has to be indicated like this because we need to animate containers back to
    // default values in onPressOut function
    setLongPress(true);

    // Animation of long press is slightly different than onPress animation
    Animated.timing(opacityBackgroundValue, {
      toValue: maxOpacity / 2,
      duration: 700,
      useNativeDriver: true,
    }).start();

    if (onLongPress) {
      onLongPress();
    }
  };

  const onPress = () => {
    const { onPress } = props;

    Animated.parallel([
      // Display background layer thru whole over the view
      Animated.timing(opacityBackgroundValue, {
        toValue: maxOpacity / 2,
        duration: 125 + diameter,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      // Opacity of ripple effect starts on maxOpacity and goes to 0
      Animated.timing(opacityRippleValue, {
        toValue: 0,
        duration: 125 + diameter,
        useNativeDriver: true,
      }),
      // Scale of ripple effect starts at 0 and goes to 1
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 125 + diameter,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After the effect is fully displayed we need background to be animated back to default
      Animated.timing(opacityBackgroundValue, {
        toValue: 0,
        duration: 225,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start()

      setDefaultAnimatedValues()
    })

    if (onPress) {
      onPress()
    }
  }

  const onPressIn = event => {
    const { onPressIn } = props

    // because we need ripple effect to be displayed exactly from press point
    setPressX(event.nativeEvent.locationX);
    setPressY(event.nativeEvent.locationY);

    if (onPressIn) {
      onPressIn()
    }
  };

  const onPressOut = () => {
    const { onPressOut } = props


    // When user use onPress all animation happens in onPress method. But when user use long
    // press. We displaye background layer in onLongPress and then we need to animate ripple
    // effect that is done here.
    if (longPress) {
      setLongPress(false);
      Animated.parallel([
        // Hide opacity background layer, slowly. It has to be done later than ripple
        // effect
        Animated.timing(opacityBackgroundValue, {
          toValue: 0,
          duration: 500 + diameter,
          useNativeDriver: true,
        }),
        // Opacity of ripple effect starts on maxOpacity and goes to 0
        Animated.timing(opacityRippleValue, {
          toValue: 0,
          duration: 125 + diameter,
          useNativeDriver: true,
        }),
        // Scale of ripple effect starts at 0 and goes to 1
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 125 + diameter,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(setDefaultAnimatedValues)
    }

    if (onPressOut) {
      onPressOut()
    }
  }

  const setDefaultAnimatedValues = () => {
    scaleValue.setValue(0)
    opacityRippleValue.setValue(maxOpacity)
  };

  const renderRippleView = () => {
    return (
      // we need set zindex for iOS, because the components with elevation have the
      // zindex set as well, thus, there could be displayed backgroundColor of
      // component with bigger zindex - and that's not good
      <Animated.View
        key="ripple-view"
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: (pressY || 0) - diameter / 2,
            left: (pressX || 0) - diameter / 2,
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            transform: [{ scale: scaleValue }],
            opacity: opacityRippleValue,
            backgroundColor: rippleColor.toString(),
            zIndex: ELEVATION_ZINDEX,
          },
        ]}
      />
    )
  }

  const renderOpacityBackground = () => (
    // we need set zindex for iOS, because the components with elevation have the
    // zindex set as well, thus, there could be displayed backgroundColor of
    // component with bigger zindex - and that's not good
    <Animated.View
      key="ripple-opacity"
      pointerEvents="none"
      style={[
        {
          ...StyleSheet.absoluteFillObject,
          opacity: opacityBackgroundValue,
          backgroundColor: rippleColor.toString(),
          zIndex: ELEVATION_ZINDEX,
        },
      ]}
    />
  );

  const { children, disabled, style, testID } = props;

  if (!isRippleVisible(props)) {
    return children
  }

  const parent = React.Children.only(children)

  const ripple = (
    <View
      key="ripple-feedback-layer"
      style={[styles.container, style.container]}
      pointerEvents="none"
    >
      {renderOpacityBackground()}
      {renderRippleView()}
    </View>
  )

  return (
    <TouchableWithoutFeedback
      testID={testID}
      disabled={disabled}
      onLayout={onLayoutChanged}
      onPressIn={onPressIn}
      onLongPress={onLongPress}
      onPressOut={onPressOut}
      onPress={onPress}
    >
      {React.cloneElement(parent, [], parent.props.children, ripple)}
    </TouchableWithoutFeedback>
  )
}

RippleFeedback.propTypes = propTypes
RippleFeedback.defaultProps = defaultProps

export default RippleFeedback;
