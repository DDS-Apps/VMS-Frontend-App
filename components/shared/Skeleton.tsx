import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton = ({
  width = "100%",
  height = 16,
  borderRadius = BorderRadius.sm,
  style,
}: SkeletonProps) => {
  const { theme } = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    return () => {
      cancelAnimation(shimmer);
    };
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: theme.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

interface SkeletonTextProps {
  lines?: number;
  lastLineWidth?: number | `${number}%`;
  lineHeight?: number;
  spacing?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonText = ({
  lines = 3,
  lastLineWidth = "60%" as `${number}%`,
  lineHeight = 14,
  spacing = Spacing.sm,
  style,
}: SkeletonTextProps) => {
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : "100%"}
          height={lineHeight}
          style={{ marginBottom: index < lines - 1 ? spacing : 0 }}
        />
      ))}
    </View>
  );
};

interface SkeletonCardProps {
  showImage?: boolean;
  imageHeight?: number;
  lines?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonCard = ({
  showImage = true,
  imageHeight = 120,
  lines = 2,
  style,
}: SkeletonCardProps) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      {showImage ? (
        <Skeleton
          width="100%"
          height={imageHeight}
          borderRadius={0}
          style={styles.cardImage}
        />
      ) : null}
      <View style={styles.cardContent}>
        <Skeleton width="70%" height={18} style={{ marginBottom: Spacing.md }} />
        <SkeletonText lines={lines} />
      </View>
    </View>
  );
};

interface SkeletonListItemProps {
  showAvatar?: boolean;
  avatarSize?: number;
  lines?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonListItem = ({
  showAvatar = true,
  avatarSize = 48,
  lines = 2,
  style,
}: SkeletonListItemProps) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.listItem,
        {
          backgroundColor: theme.surface,
          borderBottomColor: theme.border,
        },
        style,
      ]}
    >
      {showAvatar ? (
        <Skeleton
          width={avatarSize}
          height={avatarSize}
          borderRadius={avatarSize / 2}
          style={{ marginRight: Spacing.md }}
        />
      ) : null}
      <View style={styles.listItemContent}>
        <Skeleton width="60%" height={16} style={{ marginBottom: Spacing.sm }} />
        {lines > 1 ? (
          <Skeleton width="40%" height={12} />
        ) : null}
      </View>
      <Skeleton width={24} height={24} borderRadius={BorderRadius.xs} />
    </View>
  );
};

interface SkeletonListProps {
  count?: number;
  showAvatar?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonList = ({
  count = 5,
  showAvatar = true,
  style,
}: SkeletonListProps) => {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonListItem key={index} showAvatar={showAvatar} />
      ))}
    </View>
  );
};

interface SkeletonFormProps {
  fields?: number;
  showButton?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonForm = ({
  fields = 3,
  showButton = true,
  style,
}: SkeletonFormProps) => {
  return (
    <View style={style}>
      {Array.from({ length: fields }).map((_, index) => (
        <View key={index} style={styles.formField}>
          <Skeleton width="30%" height={14} style={{ marginBottom: Spacing.sm }} />
          <Skeleton width="100%" height={44} borderRadius={BorderRadius.sm} />
        </View>
      ))}
      {showButton ? (
        <Skeleton
          width="100%"
          height={48}
          borderRadius={BorderRadius.full}
          style={{ marginTop: Spacing.lg }}
        />
      ) : null}
    </View>
  );
};

interface SkeletonDashboardProps {
  cards?: number;
  style?: StyleProp<ViewStyle>;
}

export const SkeletonDashboard = ({
  cards = 4,
  style,
}: SkeletonDashboardProps) => {
  const { theme } = useTheme();

  return (
    <View style={style}>
      <Skeleton width="50%" height={24} style={{ marginBottom: Spacing.lg }} />
      <View style={styles.statsRow}>
        {Array.from({ length: Math.min(cards, 4) }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.statCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Skeleton width={40} height={40} borderRadius={BorderRadius.sm} />
            <Skeleton width="70%" height={24} style={{ marginTop: Spacing.md }} />
            <Skeleton width="50%" height={14} style={{ marginTop: Spacing.sm }} />
          </View>
        ))}
      </View>
      <Skeleton width="40%" height={20} style={{ marginTop: Spacing.xl, marginBottom: Spacing.md }} />
      <SkeletonList count={3} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  cardImage: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  cardContent: {
    padding: Spacing.lg,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  listItemContent: {
    flex: 1,
  },
  formField: {
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -Spacing.sm,
  },
  statCard: {
    width: "48%",
    marginHorizontal: "1%",
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
});
